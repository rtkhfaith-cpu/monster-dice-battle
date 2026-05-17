param(
  [string]$SheetPath = "public/assets/concepts/ladder monsters.png",
  [string]$OutRoot = "public/assets/monsters/ladder"
)

Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = "Stop"

$monsters = @(
  @{ id = "glitchroach_prime"; row = 0; col = 0 },
  @{ id = "toiletron_titan"; row = 0; col = 1 },
  @{ id = "nugget_dragon"; row = 0; col = 2 },
  @{ id = "bubble_tea_hydra"; row = 0; col = 3 },
  @{ id = "lagzilla"; row = 0; col = 4 },
  @{ id = "durian_knight"; row = 1; col = 0 },
  @{ id = "wifi_wraith"; row = 1; col = 1 },
  @{ id = "cola_kraken"; row = 1; col = 2 },
  @{ id = "charging_cable_serpent"; row = 1; col = 3 },
  @{ id = "algorithm_angel"; row = 1; col = 4 },
  @{ id = "trash_panda_ronin"; row = 2; col = 0 },
  @{ id = "pizza_meteor"; row = 2; col = 1 },
  @{ id = "cloud_catfish"; row = 2; col = 2 },
  @{ id = "keyboard_golem"; row = 2; col = 3 },
  @{ id = "noodle_basilisk"; row = 2; col = 4 },
  @{ id = "sneaker_shark"; row = 3; col = 0 },
  @{ id = "battery_bat"; row = 3; col = 1 },
  @{ id = "meme_monk"; row = 3; col = 2 },
  @{ id = "ice_cream_yeti"; row = 3; col = 3; height = 128 },
  @{ id = "microwave_mantis"; row = 3; col = 4; height = 136 },
  @{ id = "traffic_cone_cyclops"; row = 4; col = 0 },
  @{ id = "bubblewrap_blob"; row = 4; col = 1; height = 128 },
  @{ id = "drone_goblin"; row = 4; col = 2 },
  @{ id = "blackout_bunny"; row = 4; col = 3 },
  @{ id = "core_feed_beast"; row = 4; col = 4; height = 128 }
)

function Is-BackgroundPixel([System.Drawing.Color]$c) {
  return ($c.A -lt 8) -or ($c.R -lt 34 -and $c.G -lt 38 -and $c.B -lt 48)
}

function Is-LabelPixel([System.Drawing.Color]$c) {
  $max = [Math]::Max($c.R, [Math]::Max($c.G, $c.B))
  $min = [Math]::Min($c.R, [Math]::Min($c.G, $c.B))
  return $c.A -gt 8 -and $max -gt 12 -and ($max - $min) -lt 72
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

function Clear-Labels($bmp, [int]$labelStartY) {
  $height = [int]$bmp.Height
  $width = [int]$bmp.Width
  $seen = New-Object 'bool[,]' $width, $height

  for ($startY = [Math]::Max(0, $labelStartY); $startY -lt $height; $startY++) {
    for ($startX = 0; $startX -lt $width; $startX++) {
      if ($seen[$startX, $startY]) { continue }
      $seen[$startX, $startY] = $true
      if (-not (Is-LabelPixel ($bmp.GetPixel($startX, $startY)))) { continue }

      $queue = New-Object 'System.Collections.Generic.Queue[System.Drawing.Point]'
      $pixels = New-Object 'System.Collections.Generic.List[System.Drawing.Point]'
      $queue.Enqueue([System.Drawing.Point]::new($startX, $startY))
      $minX = $startX
      $maxX = $startX
      $minY = $startY
      $maxY = $startY

      while ($queue.Count -gt 0) {
        $p = $queue.Dequeue()
        $x = [int]$p.X
        $y = [int]$p.Y
        if ($x -lt 0 -or $x -ge $width -or $y -lt 0 -or $y -ge $height) { continue }
        if (-not (Is-LabelPixel ($bmp.GetPixel($x, $y)))) { continue }

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
      $looksLikeLabel = $minY -ge $labelStartY -and $componentH -le 70 -and $componentW -ge 2
      if ($looksLikeLabel) {
        foreach ($p in $pixels) {
          $bmp.SetPixel($p.X, $p.Y, [System.Drawing.Color]::FromArgb(0, 255, 255, 255))
        }
      }
    }
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

if (-not (Test-Path -LiteralPath $SheetPath)) {
  throw "Ladder monster sheet not found: $SheetPath"
}

$sheet = [System.Drawing.Bitmap]::FromFile((Resolve-Path $SheetPath))
$cellW = [Math]::Floor($sheet.Width / 5)
$cellH = [Math]::Floor($sheet.Height / 5)

foreach ($m in $monsters) {
  $id = [string]$m["id"]
  $col = [int]$m["col"]
  $row = [int]$m["row"]
  $x = [int]($col * $cellW)
  $y = [int]($row * $cellH)
  $w = if ($col -eq 4) { [int]($sheet.Width - $x) } else { [int]$cellW }
  $h = if ($row -eq 4) { [int]($sheet.Height - $y) } else { [int]$cellH }
  # Each source cell includes a printed name label. Lower rows also include the
  # previous row's label at the very top, so trim into the artwork band.
  $topPad = if ($row -eq 0) { 0 } else { 30 }
  $sidePad = 4
  $x = [int]($x + $sidePad)
  $y = [int]($y + $topPad)
  $w = [int]($w - ($sidePad * 2))
  $maxArtHeight = if ($m.ContainsKey("height")) { [int]$m["height"] } else { 156 }
  $h = [int]([Math]::Min(($h - $topPad), $maxArtHeight))

  $rect = [System.Drawing.Rectangle]::new($x, $y, $w, $h)
  $crop = $sheet.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  Flood-ClearBackground $crop
  Clear-Labels $crop 112
  $trimmed = Trim-Transparent $crop 12

  $dir = Join-Path $OutRoot $id
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $trimmed.Save((Resolve-Path $dir).Path + "\idle.png", [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Output "created $(Join-Path $dir 'idle.png')"

  $crop.Dispose()
  if ($trimmed -ne $crop) { $trimmed.Dispose() }
}

$sheet.Dispose()
