import re

def clean_roles():
    path = 'src/routes/_authenticated/roles.tsx'
    with open(path, 'r') as f:
        content = f.read()
    
    # Remove duplicates in MatrixTab
    content = content.replace('  const [toggling, setToggling] = useState<string | null>(null);\n  const [roleId, setRoleId] = useState<string>("");\n  const [toggling, setToggling] = useState<string | null>(null);', 
                              '  const [roleId, setRoleId] = useState<string>("");\n  const [toggling, setToggling] = useState<string | null>(null);')
    content = content.replace('    setToggling(permissionKey);\n    setToggling(permissionKey);', '    setToggling(permissionKey);')
    content = content.replace('        setToggling(null);\n        setToggling(null);', '        setToggling(null);')
    content = content.replace('    setToggling(null);\n    setToggling(null);\n    setToggling(null);', '    setToggling(null);')
    
    # Remove duplicates in OverridesTab
    content = content.replace('  const [userId, setUserId] = useState("");\n  const [toggling, setToggling] = useState<string | null>(null);', 
                              '  const [userId, setUserId] = useState("");\n  const [toggling, setToggling] = useState<string | null>(null);')
    # Actually I see line 387 is outside the component in the previous view. Let's check.
    # Lines 386-389:
    # 386: }
    # 387:   const [toggling, setToggling] = useState<string | null>(null);
    # 388: 
    # 389: function OverridesTab({ institutionId }: { institutionId: string | null }) {
    content = content.replace('}\n  const [toggling, setToggling] = useState<string | null>(null);\n\nfunction OverridesTab', '}\n\nfunction OverridesTab')
    
    # Cleanup OverridesTab inner duplicates
    content = content.replace('    setToggling(permissionKey);\n    setToggling(permissionKey);', '    setToggling(permissionKey);')
    
    with open(path, 'w') as f:
        f.write(content)

def clean_marks():
    path = 'src/routes/_authenticated/marks.$sheetId.tsx'
    with open(path, 'r') as f:
        content = f.read()
    
    # Fix the Save button
    content = re.sub(r'<Button onClick=\{saveMarks\} disabled=\{busy \|\| roster\.length === 0\}>\n\s+\{busy \? "Saving\.\.\." : <><Save className="size-4" strokeWidth=\{1.75\} /> Save marks</>\}\n\s+<Save className="size-4" strokeWidth=\{1\.75\} />\n\s+Save marks\n\s+</Button>',
                     r'<Button onClick={saveMarks} disabled={busy || roster.length === 0}>\n            {busy ? "Saving..." : <><Save className="size-4" strokeWidth={1.75} /> Save marks</>}\n          </Button>',
                     content)
    
    with open(path, 'w') as f:
        f.write(content)

clean_roles()
clean_marks()
