param(
  [string]$SheetPath = "public/assets/concepts/monster.png",
  [string]$OutRoot = "public/assets/monsters/normal"
)

Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = "Stop"

$monsters = @(
  @{ id = "skibidi-bot"; row = 0; col = 0 },
  @{ id = "bubble-tea-slime"; row = 0; col = 1 },
  @{ id = "67-rex"; row = 0; col = 2; right = 42 },
  @{ id = "schoolbag-golem"; row = 0; col = 3; right = 34 },
  @{ id = "t-rex"; row = 0; col = 4; left = -35 },
  @{ id = "tablet-wizard"; row = 1; col = 0 },
  @{ id = "pencil-shark"; row = 1; col = 1; left = 6; right = 8 },
  @{ id = "homework-troll"; row = 1; col = 2; left = -18; right = 26 },
  @{ id = "toilet-paper-ninja"; row = 1; col = 3; right = 30 },
  @{ id = "crocs-goblin"; row = 1; col = 4; left = -18 },
  @{ id = "iphone-warrior"; row = 2; col = 0; right = 20 },
  @{ id = "lunchbox-dragon"; row = 2; col = 1; left = -20; right = 18 },
  @{ id = "cockroachsaurus"; row = 2; col = 2; right = 72 },
  @{ id = "chickenzilla"; row = 2; col = 3; left = -44; right = 24 },
  @{ id = "water-bottle-beast"; row = 2; col = 4; left = -34 }
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

function Is-LabelPixel([System.Drawing.Color]$c) {
  return $c.A -gt 8 -and $c.R -lt 95 -and $c.G -lt 105 -and $c.B -lt 125
}

function Clear-PrintedLabels($bmp, [int]$labelStartY) {
  $width = [int]$bmp.Width
  $height = [int]$bmp.Height
  $seen = New-Object 'bool[,]' $width, $height

  for ($startY = [Math]::Max(0, $labelStartY); $startY -lt $height; $startY++) {
    for ($startX = 0; $startX -lt $width; $startX++) {
      if ($seen[$startX, $startY]) { continue }
      $seen[$startX, $startY] = $true
      $startColor = $bmp.GetPixel($startX, $startY)
      if (-not (Is-LabelPixel $startColor)) { continue }

      $queue = New-Object 'System.Collections.Generic.Queue[System.Drawing.Point]'
      $pixels = New-Object 'System.Collections.Generic.List[System.Drawing.Point]'
      $queue.Enqueue([System.Drawing.Point]::new($startX, $startY))
      $minY = $startY
      $maxY = $startY
      $minX = $startX
      $maxX = $startX

      while ($queue.Count -gt 0) {
        $p = $queue.Dequeue()
        $x = [int]$p.X
        $y = [int]$p.Y
        if ($x -lt 0 -or $x -ge $width -or $y -lt 0 -or $y -ge $height) { continue }
        $c = $bmp.GetPixel($x, $y)
        if (-not (Is-LabelPixel $c)) { continue }

        $pixels.Add([System.Drawing.Point]::new($x, $y))
        if ($x -lt $minX) { $minX = $x }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($y -gt $maxY) { $maxY = $y }

        $neighbors = @(
          [System.Drawing.Point]::new(($x + 1), $y),
          [System.Drawing.Point]::new(($x - 1), $y),
          [System.Drawing.Point]::new($x, ($y + 1)),
          [System.Drawing.Point]::new($x, ($y - 1))
        )
        foreach ($n in $neighbors) {
          if ($n.X -lt 0 -or $n.X -ge $width -or $n.Y -lt 0 -or $n.Y -ge $height -or $seen[$n.X, $n.Y]) { continue }
          $seen[$n.X, $n.Y] = $true
          if (Is-LabelPixel ($bmp.GetPixel($n.X, $n.Y))) { $queue.Enqueue($n) }
        }
      }

      $componentW = $maxX - $minX + 1
      $componentH = $maxY - $minY + 1
      $looksLikePrintedLabel = $minY -ge $labelStartY -and $componentH -ge 4 -and $componentW -ge 2
      if ($looksLikePrintedLabel) {
        $clearMinX = [Math]::Max(0, $minX - 3)
        $clearMaxX = [Math]::Min($width - 1, $maxX + 3)
        $clearMinY = [Math]::Max($labelStartY, $minY - 3)
        $clearMaxY = [Math]::Min($height - 1, $maxY + 4)
        for ($cy = $clearMinY; $cy -le $clearMaxY; $cy++) {
          for ($cx = $clearMinX; $cx -le $clearMaxX; $cx++) {
            $bmp.SetPixel($cx, $cy, [System.Drawing.Color]::FromArgb(0, 255, 255, 255))
          }
        }
      }
    }
  }
}

function Clear-BottomSafetyBand($bmp, [int]$fromY) {
  for ($y = [Math]::Max(0, $fromY); $y -lt $bmp.Height; $y++) {
    for ($x = 0; $x -lt $bmp.Width; $x++) {
      $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 255, 255, 255))
    }
  }
}

function Clear-LowerEdgeNoise($bmp, [int]$fromY) {
  $height = [int]$bmp.Height
  $width = [int]$bmp.Width
  for ($y = [Math]::Max(0, $fromY); $y -lt $height; $y++) {
    for ($x = 0; $x -lt [Math]::Min(4, $width); $x++) {
      $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 255, 255, 255))
    }
    for ($x = [Math]::Max(0, $width - 4); $x -lt $width; $x++) {
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
  # The source sheet includes printed labels under each monster. Keep the full
  # artwork area and remove only dark connected label pixels near the bottom.
  $xPad = if ($m.ContainsKey("left")) { [int]$m["left"] } else { 6 }
  $rightPad = if ($m.ContainsKey("right")) { [int]$m["right"] } else { 6 }
  $yPad = 0
  $x = [int]($x + $xPad)
  $y = [int]($y + $yPad)
  $w = [int]($w - $xPad - $rightPad)
  $h = [int]($h - $yPad)
  if ($x -lt 0) {
    $w = [int]($w + $x)
    $x = 0
  }
  if ($x + $w -gt $sheet.Width) {
    $w = [int]($sheet.Width - $x)
  }
  $rect = [System.Drawing.Rectangle]::new([int]$x, [int]$y, [int]$w, [int]$h)
  $crop = $sheet.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  Flood-ClearBackground $crop
  Clear-PrintedLabels $crop 248
  Clear-BottomSafetyBand $crop 305
  Clear-LowerEdgeNoise $crop 245
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
