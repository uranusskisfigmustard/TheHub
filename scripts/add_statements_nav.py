from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')
needle = '    <button id="classifiedsTab" class="navbtn" type="button" aria-pressed="false">CLASSIFIEDS</button>'
addition = needle + '\n    <button class="navbtn" type="button" onclick="location.href=\'https://uranusskisfigmustard.github.io/TheHub/statements.html\'">STATEMENTS</button>'
if 'https://uranusskisfigmustard.github.io/TheHub/statements.html' not in s:
    if needle not in s:
        raise SystemExit('Expected classifieds navigation anchor not found')
    s = s.replace(needle, addition, 1)
    p.write_text(s, encoding='utf-8')
