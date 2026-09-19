#!/usr/bin/env python3
"""
Parses questions-and-learning-links-v2.csv into a JSON structure grouped by
category id -> variant key -> {questions, actions, resources}.
This is an intermediate format; the Node build script merges it into the
tool's existing CATEGORIES/RESOURCES objects (preserving fields the CSV
doesn't capture, like taglines and remediation summaries).
"""
import csv
import json
import sys

def main(csv_path, out_path):
    with open(csv_path, newline='', encoding='utf-8') as f:
        rows = list(csv.DictReader(f))

    # structure: data[category_id][variant_key] = {questions: [], actions: [], article: {}, video: {}}
    data = {}

    def bucket(cat_id, variant):
        data.setdefault(cat_id, {})
        data[cat_id].setdefault(variant, {'questions': [], 'actions': [], 'article': None, 'video': None})
        return data[cat_id][variant]

    errors = []

    for i, r in enumerate(rows, start=2):  # row 2 = first data row (1 = header)
        row_type = r['Row Type'].strip()
        cat_id = r['Category ID'].strip()
        variant = r['Variant Key'].strip()  # '' for no-variant categories
        if not cat_id:
            errors.append(f'Line {i}: missing Category ID')
            continue

        b = bucket(cat_id, variant)

        if row_type == 'Question':
            opts_raw = r['Options (pipe-delimited)']
            opts = [o.strip() for o in opts_raw.split('|')]
            if len(opts) < 2:
                errors.append(f'Line {i}: question has fewer than 2 options: {r["Text"][:50]}')
                continue
            q = {'q': r['Text'].strip(), 'opts': opts}
            na = r['NA Option #'].strip()
            if na:
                try:
                    na_int = int(na)
                    if na_int < 1 or na_int > len(opts):
                        errors.append(f'Line {i}: NA Option # {na_int} out of range for {len(opts)} options')
                    else:
                        q['naIndex'] = na_int - 1
                except ValueError:
                    errors.append(f'Line {i}: NA Option # is not a number: {na!r}')
            info = r['Informational Only (Y/N)'].strip().upper()
            if info == 'Y':
                q['info'] = True
            elif info not in ('', 'N'):
                errors.append(f'Line {i}: Informational Only should be Y or N, got {info!r}')
            b['questions'].append(q)

        elif row_type == 'Checklist Item Link':
            b['actions'].append({'text': r['Text'].strip(), 'url': r['URL'].strip()})

        elif row_type == 'Learn More - Article':
            b['article'] = {'title': r['Text'].strip(), 'url': r['URL'].strip(), 'source': r['Source'].strip()}

        elif row_type == 'Learn More - Video':
            b['video'] = {'title': r['Text'].strip(), 'url': r['URL'].strip()}

        elif row_type == 'Calculation Formula':
            pass  # explanatory only, not part of the editable data model

        else:
            errors.append(f'Line {i}: unrecognized Row Type: {row_type!r}')

    if errors:
        print('PARSE ERRORS:', file=sys.stderr)
        for e in errors:
            print(' -', e, file=sys.stderr)
        sys.exit(1)

    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f'Parsed {len(rows)} rows across {len(data)} categories -> {out_path}')

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
