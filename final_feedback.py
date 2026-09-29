import re

def patch_file(path, patches):
    with open(path, 'r') as f:
        content = f.read()
    for pattern, replacement in patches:
        content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
    with open(path, 'w') as f:
        f.write(content)

# Platform Institutions Index Fixes
patch_file('src/routes/platform/institutions.index.tsx', [
    (r'Confirm</Button>', r'{busy ? "Creating..." : "Confirm"}</Button>')
])

# Platform People Fixes
patch_file('src/routes/platform/people.tsx', [
    (r'<Button onClick=\{assignToInstitution\}>Assign to institution</Button>',
     r'<Button onClick={assignToInstitution} disabled={assignBusy}>{assignBusy ? "Assigning..." : "Assign to institution"}</Button>')
])

# Platform Admin Sign-in feedback
patch_file('src/routes/platform-admin.tsx', [
    (r'Enter control plane\n            </Button>', r'{busy ? "Entering..." : "Enter control plane"}\n            </Button>')
])
