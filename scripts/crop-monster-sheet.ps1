param(
  [string]$SheetPath = "public/assets/concepts/monster.png",
  [string]$OutRoot = "public/assets/monsters/normal"
)

Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = "Stop"

$monsters = @(
  @{ id = "skibidi-bot"; row = 0; col = 0 },
  @{ id = "bubble-tea-slime"; row = 0; col = 1 },
  @{ id = "67-rex"; row = 0; col = 2 },
  @{ id = "schoolbag-golem"; row = 0; col = 3 },
  @{ id = "t-rex"; row = 0; col = 4 },
  @{ id = "tablet-wizard"; row = 1; col = 0 },
  @{ id = "pencil-shark"; row = 1; col = 1 },
  @{ id = "homework-troll"; row = 1; col = 2 },
  @{ id = "toilet-paper-ninja"; row = 1; col = 3 },
  @{ id = "crocs-goblin"; row = 1; col = 4 },
  @{ id = "iphone-warrior"; row = 2; col = 0 },
  @{ id = "lunchbox-dragon"; row = 2; col = 1 },
  @{ id = "cockroachsaurus"; row = 2; col = 2 },
  @{ id = "chickenzilla"; row = 2; col = 3 },
  @{ id = "water-bottle-beast"; row = 2; col = 4 }
)

function Is-BackgroundPixel([System.Drawing.Color]$c) {
  # Remove only the light checker/white sheet background. This keeps white monster parts intact
  # unless they are connected to the crop edge background.
  return ($c.A -lt 8) -or ($c.R -gt 218 -and $c.G -gt 218 -and $c.B -gt 218)
}

function Flood-ClearBackground($bmp) {
  $width = [int]$bmp.Width
  $height = [int]$bmp.Height
  $seen = New-Object 'bool[,]' $width, $height
  $queue = New-Object 'System.Collections.Generic.Queue[System.Drawing.Point]'

  for ($x = 0; $x -lt $width; $x++) {
    $queue.Enqueue([System.Drawing.Point]::new($x, 0))
    $queue.Enqueue([System.Drawing.Point]::new($x, ($height - 1)))
  }
  for ($y = 0; $y -lt $height; $y++) {
    $queue.Enqueue([System.Drawing.Point]::new(0, $y))
    $queue.Enqueue([System.Drawing.Point]::new(($width - 1), $y))
  }

  while ($queue.Count -gt 0) {
    $p = $queue.Dequeue()
    $x = [int]$p.X
    $y = [int]$p.Y
    if ($x -lt 0 -or $x -ge $width -or $y -lt 0 -or $y -ge $height -or $seen[$x, $y]) { continue }
    $seen[$x, $y] = $true
    $c = $bmp.GetPixel($x, $y)
    if (-not (Is-BackgroundPixel $c)) { continue }
    $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 255, 255, 255))
    $queue.Enqueue([System.Drawing.Point]::new(($x + 1), $y))
    $queue.Enqueue([System.Drawing.Point]::new(($x - 1), $y))
    $queue.Enqueue([System.Drawing.Point]::new($x, ($y + 1)))
    $queue.Enqueue([System.Drawing.Point]::new($x, ($y - 1)))
  }
}

function Trim-Transparent($bmp, [int]$pad) {
  $minX = $bmp.Width
  $minY = $bmp.Height
  $maxX = -1
  $maxY = -1
  for ($y = 0; $y -lt $bmp.Height; $y++) {
    for ($x = 0; $x -lt $bmp.Width; $x++) {
      if ($bmp.GetPixel($x, $y).A -gt 8) {
        if ($x -lt $minX) { $minX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }
  if ($maxX -lt 0) { return $bmp }
  $minX = [Math]::Max(0, $minX - $pad)
  $minY = [Math]::Max(0, $minY - $pad)
  $maxX = [Math]::Min($bmp.Width - 1, $maxX + $pad)
  $maxY = [Math]::Min($bmp.Height - 1, $maxY + $pad)
  $rect = [System.Drawing.Rectangle]::new([int]$minX, [int]$minY, [int](($maxX - $minX) + 1), [int](($maxY - $minY) + 1))
  return $bmp.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
}

function Clear-LowerBand($bmp, [int]$fromY) {
  for ($y = [Math]::Max(0, $fromY); $y -lt $bmp.Height; $y++) {
    for ($x = 0; $x -lt $bmp.Width; $x++) {
      $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 255, 255, 255))
    }
  }
}

if (-not (Test-Path -LiteralPath $SheetPath)) {
  throw "Monster sheet not found: $SheetPath"
}

$sheet = [System.Drawing.Bitmap]::FromFile((Resolve-Path $SheetPath))
$cellW = [Math]::Floor($sheet.Width / 5)
$cellH = [Math]::Floor($sheet.Height / 3)

foreach ($m in $monsters) {
  $id = [string]$m["id"]
  $col = [int]$m["col"]
  $row = [int]$m["row"]
  $x = [int]($col * $cellW)
  $y = [int]($row * $cellH)
  $w = if ($col -eq 4) { [int]($sheet.Width - $x) } else { [int]$cellW }
  $h = if ($row -eq 2) { [int]($sheet.Height - $y) } else { [int]$cellH }
  # The source sheet includes printed labels under each monster. Clear the lower
  # label band after background removal so Phaser gets clean battle sprites.
  $xPad = 6
  $rightPad = if ($id -eq "cockroachsaurus") { 28 } else { 6 }
  $yPad = 0
  $x = [int]($x + $xPad)
  $y = [int]($y + $yPad)
  $w = [int]($w - $xPad - $rightPad)
  $h = [int]($h - $yPad)
  $rect = [System.Drawing.Rectangle]::new([int]$x, [int]$y, [int]$w, [int]$h)
  $crop = $sheet.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  Flood-ClearBackground $crop
  Clear-LowerBand $crop 258
  $trimmed = Trim-Transparent $crop 14

  $dir = Join-Path $OutRoot $id
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $out = Join-Path $dir "idle.png"
  $trimmed.Save((Resolve-Path $dir).Path + "\idle.png", [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Output "created $out"

  $crop.Dispose()
  if ($trimmed -ne $crop) { $trimmed.Dispose() }
}

$sheet.Dispose()
