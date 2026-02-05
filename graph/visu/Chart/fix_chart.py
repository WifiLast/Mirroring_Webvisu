#!/usr/bin/env python3
import re

# Read the file
with open(r'c:\Users\MartinStark\Documents\GitHub\PLS\Mirroring_Webvisu\graph\visu\Chart\ElementWrapper.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Add maxTicksLimit and other properties to x-axis ticks
# Find the x-axis ticks section and add the new properties
old_x_ticks = r'(\t\t\t\t\t\tx: \{\r?\n\t\t\t\t\t\t\tticks: \{\r?\n)(\t\t\t\t\t\t\t\tfont: \{)'
new_x_ticks = r'\1\t\t\t\t\t\t\tmaxTicksLimit: 8, // Limit to max 8 ticks on x-axis\r\n\t\t\t\t\t\t\tautoSkip: true,\r\n\t\t\t\t\t\t\tmaxRotation: 45,\r\n\t\t\t\t\t\t\tminRotation: 0,\r\n\2'

content = re.sub(old_x_ticks, new_x_ticks, content)

# Write the file back
with open(r'c:\Users\MartinStark\Documents\GitHub\PLS\Mirroring_Webvisu\graph\visu\Chart\ElementWrapper.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("File updated successfully!")
