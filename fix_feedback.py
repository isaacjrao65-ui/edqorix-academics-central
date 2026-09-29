import re

def patch_file(path, patches):
    with open(path, 'r') as f:
        content = f.read()
    for pattern, replacement in patches:
        content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
    with open(path, 'w') as f:
        f.write(content)

# Roles Page Fixes
patch_file('src/routes/_authenticated/roles.tsx', [
    (r'const \[roleId, setRoleId\] = useState<string>\(""\);', 
     r'const [roleId, setRoleId] = useState<string>("");\n  const [toggling, setToggling] = useState<string | null>(null);'),
    (r'async function toggle\(permissionKey: string, next: boolean\) \{', 
     r'async function toggle(permissionKey: string, next: boolean) {\n    setToggling(permissionKey);'),
    (r'await queryClient\.invalidateQueries\(\{ queryKey: \["effective-permissions"\] \}\);', 
     r'await queryClient.invalidateQueries({ queryKey: ["effective-permissions"] });\n    setToggling(null);'),
    (r'if \(error\) \{', 
     r'if (error) {\n        setToggling(null);'),
    (r'checked=\{granted\.has\(perm\.key\)\}', 
     r'checked={granted.has(perm.key)}\n                    disabled={toggling === perm.key}'),
    (r'const \[userId, setUserId\] = useState\(""\);', 
     r'const [userId, setUserId] = useState("");\n  const [toggling, setToggling] = useState<string | null>(null);'),
    (r'async function setOverride\(permissionKey: string, value: "inherit" \| "allow" \| "deny"\) \{', 
     r'async function setOverride(permissionKey: string, value: "inherit" | "allow" | "deny") {\n    setToggling(permissionKey);'),
    (r'value=\{value\}', 
     r'value={value}\n                      disabled={toggling === perm.key}')
])

# Mark Sheet Page Fixes
patch_file('src/routes/_authenticated/marks.$sheetId.tsx', [
    (r'<Button onClick=\{saveMarks\} disabled=\{busy \|\| roster\.length === 0\}>', 
     r'<Button onClick={saveMarks} disabled={busy || roster.length === 0}>\n            {busy ? "Saving..." : <><Save className="size-4" strokeWidth={1.75} /> Save marks</>}'),
    (r'<Button\s+variant="outline"\s+disabled=\{busy \|\| roster\.length === 0\}\s+onClick=\{async \(\) => \{',
     r'<Button variant="outline" disabled={busy || roster.length === 0} onClick={async () => {'),
    (r'Submit for verification', r'{busy ? "Submitting..." : "Submit for verification"}'),
    (r'Verify\n            </Button>', r'{busy ? "Verifying..." : "Verify"}\n            </Button>'),
    (r'Approve\n          </Button>', r'{busy ? "Approving..." : "Approve"}\n          </Button>'),
    (r'Publish result\n          </Button>', r'{busy ? "Publishing..." : "Publish result"}\n          </Button>'),
    (r'Unlock for correction\n          </Button>', r'{busy ? "Unlocking..." : "Unlock for correction"}\n          </Button>')
])

# Staff Management Fixes
patch_file('src/routes/_authenticated/staff.tsx', [
    (r'\{verb\}\n          </Button>', r'{busy ? "Processing..." : verb}\n          </Button>'),
    (r'Generate new password\n            </Button>', r'{busy ? "Generating..." : "Generate new password"}\n            </Button>')
])

# Platform Shell Quick Actions Fixes
patch_file('src/components/platform-shell.tsx', [
    (r'\{ label: "Create institution admin", to: "/platform/people" \}', 
     r'{ label: "Manage institution admins", to: "/platform/people" }'),
    (r'\{ label: "Grant a permission", to: "/platform/permissions" \}', 
     r'{ label: "Review permission requests", to: "/platform/permissions" }')
])
