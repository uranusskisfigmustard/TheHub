#!/usr/bin/env python3
"""Validate the public notebook's shape and guard against raw private exports.

This cannot establish that prose is player-known. Human source review remains
required; the whole JSON is public, not an authorization boundary.
"""
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def validate(data):
    def require(condition, message):
        if not condition:
            raise ValueError(message)

    require(set(data) == {'schemaVersion', 'updated', 'scope', 'entries'}, 'Unexpected top-level fields')
    require(data['schemaVersion'] == 1, 'Unsupported schema version')
    require(isinstance(data['entries'], list) and data['entries'], 'Missing public entries')
    require(re.fullmatch(r'\d{4}-\d{2}-\d{2}', data['updated']) is not None, 'Invalid editorial update date')
    ids = set()
    groups = set()
    for entry in data['entries']:
        required_entry_fields = {'id', 'type', 'name', 'role', 'affiliations', 'notes'}
        allowed_entry_fields = required_entry_fields | {'portrait', 'encountered'}
        require(required_entry_fields <= set(entry) <= allowed_entry_fields, 'Unexpected entry fields: no private record exports')
        if entry.get('type') == 'person':
            require(entry.get('encountered') is True, 'Person lacks verified encounter')
        else:
            require('encountered' not in entry, 'Groups cannot have encounter flags')
        require(isinstance(entry['id'], str) and re.fullmatch(r'[a-z0-9-]+', entry['id']), 'Invalid anchor')
        require(entry['id'] not in ids, 'Duplicate anchor: ' + entry['id'])
        if 'portrait' in entry:
            portrait_pattern = r'assets/portraits/[a-z0-9-]+\.(png|jpg|jpeg|webp)' if entry['type'] == 'person' else r'assets/(portraits|logos)/[a-z0-9-]+\.(png|jpg|jpeg|webp)'
            require(isinstance(entry['portrait'], str) and re.fullmatch(portrait_pattern, entry['portrait']), 'Unsafe portrait path')
            require((ROOT / entry['portrait']).is_file(), 'Missing portrait asset')
        ids.add(entry['id'])
        require(entry['type'] in ('person', 'group'), 'Invalid entry type')
        if entry['type'] == 'group':
            groups.add(entry['id'])
        require(isinstance(entry['name'], str) and entry['name'].strip(), 'Name required')
        require(isinstance(entry['role'], str) and entry['role'].strip(), 'Role required')
        require(isinstance(entry['affiliations'], list), 'Connections must be a list')
        require(isinstance(entry['notes'], list) and entry['notes'], 'Public notes required')
        for note in entry['notes']:
            require(set(note) in ({'kind', 'text', 'by', 'source'}, {'kind', 'text', 'by', 'source', 'overview'}), 'Unexpected note fields')
            if 'overview' in note:
                require(note['overview'] is True, 'Overview marker must be true')
            require(note['kind'] in ('known', 'reported', 'suspected', 'unconfirmed'), 'Invalid note type')
            require(isinstance(note['text'], str) and 0 < len(note['text'].strip()) <= 700, 'Use a short public summary')
            require(isinstance(note['source'], str) and note['source'].strip(), 'Source attribution required')
            require(isinstance(note['by'], list) and note['by'] and len(note['by']) == len(set(note['by'])), 'Known-to list required')
            require(set(note['by']) <= {'john', 'prue', 'cassidy'}, 'Unknown character')
        require(sum(note.get('overview') is True for note in entry['notes']) == 1, 'Exactly one overview note required: ' + entry['id'])
    for entry in data['entries']:
        require(set(entry['affiliations']) <= groups, 'Unknown group connection: ' + entry['id'])
    serialized = json.dumps(data)
    require(not re.search(r'WARDEN-ONLY|\bPROV\b|\bSUPERSEDED\b|docs\.google\.com|drive\.google\.com', serialized), 'Possible private-source content in public notebook')
    script = (ROOT / 'contacts.js').read_text(encoding='utf-8')
    require("fetch('data/player-contacts.json" in script, 'Missing curated public source')
    require('innerHTML' not in script, 'Render note text as text, not HTML')
    return len(data['entries']), sum(len(entry['notes']) for entry in data['entries'])


if __name__ == '__main__':
    try:
        data = json.loads((ROOT / 'data/player-contacts.json').read_text(encoding='utf-8'))
        count, notes = validate(data)
    except (ValueError, TypeError, KeyError) as exc:
        raise SystemExit('ERROR: ' + str(exc)) from exc
    print(f'OK: {count} public entries and {notes} attributed notes; private-export guards passed.')
