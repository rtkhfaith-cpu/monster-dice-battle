# Create/update Lambda Function URL proxy so CloudFront can reach Amplify
# without CloudFront→CloudFront 403. Amplify Basic Auth stays enabled.
$ErrorActionPreference = 'Stop'
$Region = 'us-east-1'
$FnName = 'rtkhfaith-mdb-amplify-proxy'
$RoleName = 'rtkhfaith-mdb-amplify-proxy-role'
$DistId = 'EVL1A0RG2G75I'
$OriginId = 'AmplifyProxyLambda'
$AmplifyOrigin = 'https://master.d4ud0u4vg91jy.amplifyapp.com'
$SrcDir = Join-Path $PSScriptRoot 'lambda-proxy'
$ZipPath = Join-Path $env:TEMP 'mdb-amplify-proxy.zip'

Write-Host '==> Packaging Lambda'
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
Compress-Archive -Path (Join-Path $SrcDir 'index.mjs') -DestinationPath $ZipPath -Force

Write-Host '==> IAM role'
$trust = '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
$roleArn = $null
try {
  $roleArn = aws iam get-role --role-name $RoleName --query 'Role.Arn' --output text
} catch { $roleArn = $null }
if (-not $roleArn -or $roleArn -eq 'None') {
  $trustFile = Join-Path $env:TEMP 'mdb-proxy-trust.json'
  [System.IO.File]::WriteAllText($trustFile, $trust, (New-Object System.Text.UTF8Encoding $false))
  $roleArn = aws iam create-role --role-name $RoleName --assume-role-policy-document "file://$trustFile" --query 'Role.Arn' --output text
  aws iam attach-role-policy --role-name $RoleName --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
  Write-Host 'Waiting for role propagation...'
  Start-Sleep -Seconds 12
}
Write-Host "RoleArn=$roleArn"

Write-Host '==> Create/update Lambda'
$exists = $true
try {
  aws lambda get-function --region $Region --function-name $FnName | Out-Null
} catch { $exists = $false }

if ($exists) {
  aws lambda update-function-code --region $Region --function-name $FnName --zip-file "fileb://$ZipPath" | Out-Null
  aws lambda wait function-updated --region $Region --function-name $FnName
  aws lambda update-function-configuration --region $Region --function-name $FnName `
    --runtime nodejs20.x --handler index.handler --timeout 30 --memory-size 512 `
    --environment "Variables={AMPLIFY_ORIGIN=$AmplifyOrigin}" | Out-Null
} else {
  aws lambda create-function --region $Region --function-name $FnName `
    --runtime nodejs20.x --role $roleArn --handler index.handler `
    --zip-file "fileb://$ZipPath" --timeout 30 --memory-size 512 `
    --environment "Variables={AMPLIFY_ORIGIN=$AmplifyOrigin}" | Out-Null
  aws lambda wait function-active --region $Region --function-name $FnName
}

Write-Host '==> Function URL'
$urlInfo = aws lambda get-function-url-config --region $Region --function-name $FnName 2>$null
if (-not $urlInfo) {
  aws lambda create-function-url-config --region $Region --function-name $FnName `
    --auth-type NONE --cors '{"AllowOrigins":["*"],"AllowMethods":["*"],"AllowHeaders":["*"]}' | Out-Null
  aws lambda add-permission --region $Region --function-name $FnName `
    --statement-id FunctionURLAllowPublic --action lambda:InvokeFunctionUrl `
    --principal '*' --function-url-auth-type NONE 2>$null | Out-Null
}
$fnUrl = aws lambda get-function-url-config --region $Region --function-name $FnName --query 'FunctionUrl' --output text
$fnHost = ([Uri]$fnUrl).Host
Write-Host "FunctionUrl=$fnUrl"
Write-Host "OriginHost=$fnHost"

Write-Host '==> Point CloudFront origin at Lambda Function URL'
$raw = aws cloudfront get-distribution-config --id $DistId --output json
$parsed = $raw | ConvertFrom-Json
$etag = $parsed.ETag
$dc = $parsed.DistributionConfig

# Replace origins with Lambda proxy origin
$dc.Origins = @{
  Quantity = 1
  Items = @(
    @{
      Id = $OriginId
      DomainName = $fnHost
      OriginPath = ''
      CustomHeaders = @{ Quantity = 0; Items = @() }
      CustomOriginConfig = @{
        HTTPPort = 80
        HTTPSPort = 443
        OriginProtocolPolicy = 'https-only'
        OriginSslProtocols = @{ Quantity = 1; Items = @('TLSv1.2') }
        OriginReadTimeout = 30
        OriginKeepaliveTimeout = 5
      }
      ConnectionAttempts = 3
      ConnectionTimeout = 10
      OriginShield = @{ Enabled = $false }
      OriginAccessControlId = ''
    }
  )
}
$dc.DefaultCacheBehavior.TargetOriginId = $OriginId
# AllViewerExceptHostHeader
$dc.DefaultCacheBehavior.OriginRequestPolicyId = '216adef6-5c7f-47e4-b989-5492eafa07d3'
$dc.DefaultCacheBehavior.CachePolicyId = '4135ea2d-6df8-44a3-9df3-4b5a84be39ad'

$outFile = Join-Path $env:TEMP 'cf-mdb-origin-update.json'
$json = $dc | ConvertTo-Json -Depth 40 -Compress:$false
# Fix PowerShell JSON quirks for CloudFront: Quantity fields must be numbers
[System.IO.File]::WriteAllText($outFile, $json, (New-Object System.Text.UTF8Encoding $false))

# Use aws cli with JMES / python for safer JSON - try direct update
python -c @"
import json,sys
p=r'''$outFile'''
with open(p,'r',encoding='utf-8') as f: d=json.load(f)
# Ensure required nullables
for o in d['Origins']['Items']:
    o.setdefault('OriginAccessControlId','')
    if 'CustomHeaders' in o and 'Items' not in o['CustomHeaders']:
        o['CustomHeaders']['Items']=[]
with open(p,'w',encoding='utf-8') as f: json.dump(d,f)
print('json ok')
"@

aws cloudfront update-distribution --id $DistId --if-match $etag --distribution-config "file://$outFile"
aws cloudfront create-invalidation --distribution-id $DistId --paths '/*' --query 'Invalidation.Id' --output text
Write-Host 'Done. Wait ~60s then test app root (expect 401) and /robots.txt (expect 200).'
