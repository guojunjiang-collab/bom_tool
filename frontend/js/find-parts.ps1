$content = Get-Content 'pages.js'
$lineNum = 0
foreach ($line in $content) {
    $lineNum++
    if ($line -match '^\s*parts:\s*function') {
        Write-Host "parts function starts at line $lineNum"
        # 找到开始后，继续查找结束的 }
        $braceCount = 0
        $endLine = $lineNum - 1
        for ($i = $lineNum - 1; $i -lt $content.Count; $i++) {
            $currentLine = $content[$i]
            $endLine = $i + 1
            # 计算大括号
            $openBraces = ($currentLine -split '\{' | Measure-Object).Count - 1
            $closeBraces = ($currentLine -split '\}' | Measure-Object).Count - 1
            $braceCount += $openBraces - $closeBraces
            
            if ($braceCount -eq 0) {
                Write-Host "parts function ends at line $endLine"
                break
            }
        }
        break
    }
}