const sqlite3 = require('sqlite3').verbose()
const fs = require('fs')
const path = require('path')
const { typeSections, operatorSections, guideSections } = require('./constants')

const dbFilePath = path.join(
  __dirname,
  '../json-schema.docset/Contents/Resources/docSet.dsidx'
)
try {
  fs.unlinkSync(dbFilePath)
} catch {}
const db = new sqlite3.Database(dbFilePath)

db.serialize(() => {
  db.run(
    'CREATE TABLE searchIndex(id INTEGER PRIMARY KEY, name TEXT, type TEXT, path TEXT)'
  )
  db.run('CREATE UNIQUE INDEX anchor ON searchIndex (name, type, path);')

  const stmt = db.prepare(
    'INSERT OR IGNORE INTO searchIndex(name, type, path) VALUES (?, ?, ?)'
  )
  typeSections.forEach(([title, name, dir]) => {
    stmt.run(title, 'Type', path.join(dir, `${name}.html`))
  })
  operatorSections.forEach(([title, name, dir]) => {
    stmt.run(title, 'Operator', path.join(dir, `${name}.html`))
  })
  guideSections.forEach(([title, name, dir]) => {
    stmt.run(title, 'Guide', path.join(dir, `${name}.html`))
  })
  stmt.finalize()
})

db.close()
