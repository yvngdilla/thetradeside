"""Re-embed the official state PDFs as base64 TypeScript modules."""
import base64, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
pdf = base64.b64encode((root / "forms/ca/cdtfa-230.pdf").read_bytes()).decode()
(root / "src/lib/forms/cdtfa-230.ts").write_text(
    "// Official CDTFA-230 (rev. 8-17) from forms/ca/cdtfa-230.pdf, embedded so it ships with every\n"
    "// server bundle. Regenerate with scripts/embed-forms.py if the state updates the form.\n"
    f'export const CDTFA_230_BASE64 =\n  "{pdf}";\n'
)
