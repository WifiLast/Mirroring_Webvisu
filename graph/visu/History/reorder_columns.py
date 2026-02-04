import re

# Read the file
with open('ElementWrapper.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the old and new column definitions
old_columns = '''columns: [
				{ name: "Description", id: "Description" },
				{ name: "ID", id: "ID" },
				{ name: "Equip ID", id: "EQUIP_ID" },
				{ name: "Value", id: "Value" },
				{ name: "Timestamp", id: "TIMESTAMP" }
			]'''

new_columns = '''columns: [
				{ name: "Time Stamp", id: "TIMESTAMP" },
				{ name: "Plant Nr.", id: "ID" },
				{ name: "Equipment ID", id: "EQUIP_ID" },
				{ name: "Description", id: "Description", width: "40%" },
				{ name: "Value", id: "Value" }
			]'''

# Replace
content = content.replace(old_columns, new_columns)

# Write back
with open('ElementWrapper.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Columns reordered successfully!")
