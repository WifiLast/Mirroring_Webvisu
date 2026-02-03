import urllib.request
import os
import sys

url = "https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"
dest = r"c:\Users\MartinStark\Documents\GitHub\PLS\Mirroring_Webvisu\graph\visu\chart.min.js"

print(f"Downloading from {url} to {dest}...")
try:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response, open(dest, 'wb') as out_file:
        data = response.read()
        out_file.write(data)
    print(f"Success! File size: {os.path.getsize(dest)} bytes")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
