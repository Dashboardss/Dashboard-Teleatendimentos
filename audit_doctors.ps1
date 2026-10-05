$ErrorActionPreference = "Stop"

$extractPath = "$($pwd.Path)\temp_xlsx_audit"
if (Test-Path $extractPath) { Remove-Item -Recurse -Force $extractPath -ErrorAction SilentlyContinue }

Add-Type -AssemblyName System.IO.Compression.FileSystem
$file = Get-ChildItem -Path . -File | Where-Object { $_.Extension -eq '.xlsx' } | Select-Object -First 1

if (-not $file) { Write-Error "Nenhum arquivo XLSX encontrado."; exit 1 }

Write-Host "Processando: $($file.Name)"
[System.IO.Compression.ZipFile]::ExtractToDirectory($file.FullName, $extractPath)

# Shared Strings
$ssRaw = Get-Content "$extractPath\xl\sharedStrings.xml" -Raw -Encoding UTF8
$siMatches = [regex]::Matches($ssRaw, '(?s)<si[^>]*>(.*?)</si>')
$strings = [System.Collections.Generic.List[string]]::new()
for ($i = 0; $i -lt $siMatches.Count; $i++) {
    $txt = $siMatches[$i].Groups[1].Value -replace '<[^>]+>', '' -replace '[\r\n]', ' '
    $strings.Add($txt.Trim())
}

# Status maps
$realizadosIds = [System.Collections.Generic.HashSet[string]]::new()
$nRealizadosIds = [System.Collections.Generic.HashSet[string]]::new()
for ($i = 0; $i -lt $strings.Count; $i++) {
    $lower = $strings[$i].ToLower()
    if ($lower -eq 'atendido') { [void]$realizadosIds.Add([string]$i) }
    if ($lower -match 'cancelado|vagas livres|vaga livre|nao atend|n.o atend|nao realiz|n.o realiz|ausente|obito|bloqueada|nao atendeu|n.o atendeu') {
        if (-not ($lower -match 'motivo|profissional|data|especif|planilha')) {
            [void]$nRealizadosIds.Add([string]$i)
        }
    }
}

# Workbook sheets map
$wbRaw = Get-Content "$extractPath\xl\workbook.xml" -Raw -Encoding UTF8
$sheetMatches = [regex]::Matches($wbRaw, 'name="([^"]+)"[^>]*sheetId="(\d+)"')
$sheetsMap = @{}
foreach ($m in $sheetMatches) {
    $sheetsMap["sheet" + $m.Groups[2].Value + ".xml"] = $m.Groups[1].Value
}

# Month filter
$mMapFull = @{ 'JAN'='Janeiro'; 'FEV'='Fevereiro'; 'MAR'='Marco'; 'ABR'='Abril'; 'MAI'='Maio'; 'JUN'='Junho'; 'JUL'='Julho'; 'AGO'='Agosto'; 'SET'='Setembro'; 'OUT'='Outubro'; 'NOV'='Novembro'; 'DEZ'='Dezembro' }
$monthNums = @{ 'SET'=9; 'OUT'=10; 'NOV'=11; 'DEZ'=12; 'JAN'=1; 'FEV'=2; 'MAR'=3; 'ABR'=4; 'MAI'=5; 'JUN'=6; 'JUL'=7; 'AGO'=8 }

# allData: profName -> monthKey -> { r, nr }
$allData = @{}

$sheets = Get-ChildItem "$extractPath\xl\worksheets\*.xml" | Sort-Object Name
foreach ($sheetFile in $sheets) {
    $sheetName = $sheetsMap[$sheetFile.Name]
    if (-not $sheetName) { continue }
    if (-not ($sheetName -match '^(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ|OUTUBRO|NOVEMBRO|DEZEMBRO)')) { continue }

    $monthClean = ($sheetName -replace '\s*-.*$', '').Trim().ToUpper()
    $year = "26"
    if ($sheetName -match '25|2025') { $year = "25" }
    elseif ($sheetName -match '27|2027') { $year = "27" }
    elseif ($sheetName -match '26|2026') { $year = "26" }
    else { if ($monthClean -match 'OUT|NOV|DEZ') { $year = "25" } }

    $prefix = ($monthClean -replace '\d+','' -replace '-','').Trim()
    if ($prefix.Length -gt 3) { $prefix = $prefix.Substring(0, 3) }

    $mFull = $mMapFull[$prefix]
    if (-not $mFull) { continue }
    $monthKey = "$mFull/$year"

    $sheetRaw = Get-Content $sheetFile.FullName -Raw -Encoding UTF8
    $rowMatches = [regex]::Matches($sheetRaw, '(?s)<row [^>]*r="(\d+)"[^>]*>(.*?)</row>')

    $currentProf = $null

    foreach ($row in $rowMatches) {
        $rowContent = $row.Groups[2].Value
        $cellVals = [System.Collections.Generic.List[string]]::new()
        $cellIndices = [System.Collections.Generic.List[string]]::new()
        $cellMatches2 = [regex]::Matches($rowContent, '<c[^>]*t="s"[^>]*><v>(\d+)</v></c>')
        foreach ($c in $cellMatches2) {
            $idx = $c.Groups[1].Value
            $cellIndices.Add($idx)
            $idxInt = [int]$idx
            if ($idxInt -lt $strings.Count) { $cellVals.Add($strings[$idxInt]) }
        }

        $allText = $cellVals -join " "

        # Detect doctor name row
        if ($allText -match '(Dr\.|Dra\.|Dr\s|Dra\s|Dr°|Dra°|Drª|Draª)\s*([\w]+(\s+[\w]+){1,5})' -and -not ($allText -match 'atendido|cancelado|vaga')) {
            $rawMatch = $Matches[0].Trim()
            # Normalize: take only first ~3 words after "Dr/Dra"
            $parts = $rawMatch -split '\s+'
            $nameWords = @()
            $foundTitle = $false
            foreach ($part in $parts) {
                if ($part -match '^(Dr\.|Dra\.|Drª|Draª|Dr$|Dra$)') { $foundTitle = $true; $nameWords += $part; continue }
                if ($foundTitle) { $nameWords += $part; if ($nameWords.Count -ge 3) { break } }
            }
            $currentProf = ($nameWords -join ' ').Trim()
        } elseif ($currentProf) {
            foreach ($idx in $cellIndices) {
                if ($realizadosIds.Contains($idx)) {
                    if (-not $allData[$currentProf]) { $allData[$currentProf] = @{} }
                    if (-not $allData[$currentProf][$monthKey]) { $allData[$currentProf][$monthKey] = @{ r=0; nr=0 } }
                    $allData[$currentProf][$monthKey].r++
                } elseif ($nRealizadosIds.Contains($idx)) {
                    if (-not $allData[$currentProf]) { $allData[$currentProf] = @{} }
                    if (-not $allData[$currentProf][$monthKey]) { $allData[$currentProf][$monthKey] = @{ r=0; nr=0 } }
                    $allData[$currentProf][$monthKey].nr++
                }
            }
        }
    }
}

Remove-Item -Recurse -Force $extractPath -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=========================================="
Write-Host "  AUDITORIA DE PROFISSIONAIS NA PLANILHA  "
Write-Host "=========================================="
Write-Host ""

$profsSorted = $allData.Keys | Where-Object { $allData[$_].Values | ForEach-Object { $_.r + $_.nr } | Measure-Object -Sum | Select-Object -ExpandProperty Sum | Where-Object { $_ -gt 0 } } | Sort-Object

foreach ($prof in ($allData.Keys | Sort-Object)) {
    $totR = 0; $totNR = 0
    foreach ($mk in $allData[$prof].Keys) { $totR += $allData[$prof][$mk].r; $totNR += $allData[$prof][$mk].nr }
    $tot = $totR + $totNR
    if ($tot -eq 0) { continue }
    Write-Host "PROF: $prof"
    Write-Host "  Total: $tot  |  Realizados: $totR  |  Nao Realizados: $totNR"
    # Sort months
    $months = $allData[$prof].Keys | Sort-Object
    foreach ($mk in $months) {
        $r = $allData[$prof][$mk].r; $nr = $allData[$prof][$mk].nr
        if ($r -gt 0 -or $nr -gt 0) {
            Write-Host "    $mk -> R:$r  NR:$nr"
        }
    }
    Write-Host ""
}
