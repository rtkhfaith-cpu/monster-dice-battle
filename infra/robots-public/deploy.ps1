# Deploy public /robots.txt bypass for rtkhfaith.com + monster-dice-battle.rtkhfaith.com
# Must run in us-east-1 (CloudFront ACM requirement).
$ErrorActionPreference = 'Stop'
$StackName = 'rtkhfaith-robots-public'
$Region = 'us-east-1'
$HostedZoneId = 'Z01185181EM3J2CKIGUZU'
$Template = Join-Path $PSScriptRoot 'template.yaml'

Write-Host '==> Removing Amplify CNAME for monster-dice-battle (will become CF alias A/AAAA)...'
$existing = aws route53 list-resource-record-sets `
  --hosted-zone-id $HostedZoneId `
  --query "ResourceRecordSets[?Name=='monster-dice-battle.rtkhfaith.com.' && Type=='CNAME']" `
  --output json | ConvertFrom-Json

if ($existing -and $existing.Count -gt 0) {
  $rr = $existing[0]
  $change = @{
    Comment = 'Replace Amplify CNAME with CloudFront alias for robots bypass'
    Changes = @(
      @{
        Action = 'DELETE'
        ResourceRecordSet = @{
          Name = $rr.Name
          Type = $rr.Type
          TTL  = $rr.TTL
          ResourceRecords = $rr.ResourceRecords
        }
      }
    )
  }
  $changeFile = Join-Path $env:TEMP 'mdb-cname-delete.json'
  $change | ConvertTo-Json -Depth 8 | Set-Content -Path $changeFile -Encoding utf8
  aws route53 change-resource-record-sets --hosted-zone-id $HostedZoneId --change-batch "file://$changeFile"
  Write-Host 'CNAME deleted.'
} else {
  Write-Host 'No CNAME to delete (already alias or missing).'
}

Write-Host '==> Deploying CloudFormation stack (cert + CloudFront Function + DNS)...'
aws cloudformation deploy `
  --region $Region `
  --stack-name $StackName `
  --template-file $Template `
  --parameter-overrides HostedZoneId=$HostedZoneId AmplifyOriginDomain=d4ud0u4vg91jy.amplifyapp.com `
  --capabilities CAPABILITY_NAMED_IAM `
  --no-fail-on-empty-changeset

Write-Host '==> Stack outputs'
aws cloudformation describe-stacks --region $Region --stack-name $StackName `
  --query 'Stacks[0].Outputs' --output table

Write-Host '==> Updating Amplify custom rules so /robots.txt is not SPA-fallback rewritten'
$rules = @(
  @{ source = '/robots.txt'; target = '/robots.txt'; status = '200' },
  @{ source = '/<*>'; target = '/index.html'; status = '404-200' }
) | ConvertTo-Json -Compress
# Amplify CLI expects file or structured update — use update-app with customRules via JSON file
$appUpdate = @{ customRules = @(
    @{ source = '/robots.txt'; target = '/robots.txt'; status = '200' },
    @{ source = '/<*>'; target = '/index.html'; status = '404-200' }
  ) }
# Use AWS CLI shorthand for two rules
aws amplify update-app --region ap-southeast-1 --app-id d4ud0u4vg91jy `
  --custom-rules 'source=/robots.txt,target=/robots.txt,status=200' 'source=/<*>,target=/index.html,status=404-200'

Write-Host 'Done. Wait ~1-2 minutes for DNS/CloudFront, then test:'
Write-Host '  curl.exe -sI https://rtkhfaith.com/robots.txt'
Write-Host '  curl.exe -sI https://monster-dice-battle.rtkhfaith.com/robots.txt'
