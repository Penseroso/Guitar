import os

file_path = r"c:\Users\topco\OneDrive\바탕 화면\Guitar\src\components\guitar\ClientApp.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = "const fingering = useMemo(() => {"
end_marker = "}, [mode, currentVoicingShape, selectedKey]);"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx)

if start_idx == -1 or end_idx == -1:
    print("Markers not found!")
    exit(1)

# Keep the end marker but replace everything before it up to start marker + length
# Actually I want to replace the BODY.
# The body starts after `start_marker` + newline? 
# content[start_idx] is start of "const fingering..."

# I want to replace from start_idx to end_idx + len(end_marker) with the new full block.

new_block = """    const fingering = useMemo(() => {
        if (mode !== 'chord') return undefined;
        if (!currentVoicingShape) return undefined;

        return getChordFingering(currentVoicingShape, selectedKey, TUNING);
    }, [mode, currentVoicingShape, selectedKey]);"""

new_content = content[:start_idx] + new_block + content[end_idx + len(end_marker):]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Successfully updated ClientApp.tsx")
