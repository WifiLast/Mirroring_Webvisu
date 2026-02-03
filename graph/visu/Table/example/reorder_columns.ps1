$content = Get-Content 'ElementWrapper.js' -Raw

# Replace the columns array
$oldColumns = @'
			columns: [
				{ name: "Description", id: "Description" },
				{ name: "ID", id: "ID" },
				{ name: "Equip ID", id: "EQUIP_ID" },
				{ name: "Value", id: "Value" },
				{ name: "Timestamp", id: "TIMESTAMP" }
			],
'@

$newColumns = @'
			columns: [
				{ name: "Time Stamp", id: "TIMESTAMP" },
				{ name: "Plant Nr.", id: "ID" },
				{ name: "Equipment ID", id: "EQUIP_ID" },
				{ name: "Description", id: "Description", width: "40%" },
				{ name: "Value", id: "Value" }
			],
'@

$content = $content -replace [regex]::Escape($oldColumns), $newColumns
$content | Set-Content 'ElementWrapper.js' -NoNewline
Write-Host "Columns reordered successfully"
