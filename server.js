const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
// Use a writable data directory (supports mounting a volume on Fly.io)
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'calculations.db');
const SHARED_LOGIN_USERNAME = 'tehnolift';
const SHARED_LOGIN_PASSWORD = 'tehnolift123';
const LEGACY_LOGIN_USERNAME = 'demo';
const LEGACY_LOGIN_PASSWORD = 'demo123';

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

function ensureColumn(tableName, columnName, definition, cb) {
  db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
    if (err) return cb(err);
    const columns = Array.isArray(rows) ? rows : [];
    const exists = columns.some((column) => column.name === columnName);
    if (exists) return cb();
    db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`, cb);
  });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Ne mogu da otvorim bazu:', err.message);
    process.exit(1);
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT DEFAULT 'user',
      createdAt TEXT
    )
  `, (userTableErr) => {
    if (userTableErr) {
      console.error('Ne mogu da napravim tabelu users:', userTableErr.message);
      process.exit(1);
    }

    db.run(`
      CREATE TABLE IF NOT EXISTS calculations (
        id TEXT PRIMARY KEY,
        date TEXT,
        commercialist TEXT,
        model TEXT,
        customer TEXT,
        supplier TEXT,
        note TEXT,
        factory REAL,
        transport REAL,
        batteryWeight REAL,
        other REAL,
        eco REAL,
        customs REAL,
        purchase REAL,
        margin REAL,
        sale REAL,
        profit REAL,
        actual REAL,
        status TEXT,
        createdAt TEXT,
        createdBy TEXT,
        productType TEXT,
        chargerWeight REAL,
        chargerPrice REAL,
        ecoCharger REAL,
        customsCharger REAL,
        purchaseCharger REAL,
        marginCharger REAL,
        saleCharger REAL,
        profitCharger REAL,
        actualCharger REAL,
        purchaseSet REAL,
        suggestedSet REAL,
        saleSet REAL,
        profitSet REAL,
        actualSet REAL,
        suggested REAL,
        suggestedCharger REAL
      )
    `, (createErr) => {
      if (createErr) {
        console.error('Ne mogu da napravim tabelu calculations:', createErr.message);
        process.exit(1);
      }

      const migrationColumns = [
        ['createdBy', 'TEXT'],
        ['productType', 'TEXT'],
        ['chargerWeight', 'REAL'],
        ['chargerPrice', 'REAL'],
        ['chargerTransport', 'REAL'],
        ['ecoCharger', 'REAL'],
        ['customsCharger', 'REAL'],
        ['purchaseCharger', 'REAL'],
        ['marginCharger', 'REAL'],
        ['saleCharger', 'REAL'],
        ['profitCharger', 'REAL'],
        ['actualCharger', 'REAL'],
        ['purchaseSet', 'REAL'],
        ['suggestedSet', 'REAL'],
        ['saleSet', 'REAL'],
        ['profitSet', 'REAL'],
        ['actualSet', 'REAL'],
        ['suggested', 'REAL'],
        ['suggestedCharger', 'REAL']
      ];

      const ensureNext = (index) => {
        if (index >= migrationColumns.length) {
          console.log('SQLite baza je spremna');
          return;
        }

        const [columnName, definition] = migrationColumns[index];
        ensureColumn('calculations', columnName, definition, (migrationErr) => {
          if (migrationErr) {
            console.error(`Ne mogu da dodam ${columnName} kolonu:`, migrationErr.message);
            process.exit(1);
          }
          ensureNext(index + 1);
        });
      };

      ensureNext(0);
    });
  });
});

function runSql(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function allSql(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function normalize(item = {}) {
  return {
    ...item,
    factory: Number(item.factory || 0),
    transport: Number(item.transport || 0),
    batteryWeight: Number(item.batteryWeight || 0),
    chargerWeight: Number(item.chargerWeight || 0),
    chargerPrice: Number(item.chargerPrice || 0),
    chargerTransport: Number(item.chargerTransport || 0),
    other: Number(item.other || 0),
    eco: Number(item.eco || 0),
    ecoCharger: Number(item.ecoCharger || 0),
    customs: Number(item.customs || 0),
    customsCharger: Number(item.customsCharger || 0),
    purchase: Number(item.purchase || 0),
    purchaseCharger: Number(item.purchaseCharger || 0),
    purchaseSet: Number(item.purchaseSet || 0),
    margin: Number(item.margin || 0),
    marginCharger: Number(item.marginCharger || 0),
    sale: Number(item.sale || 0),
    saleCharger: Number(item.saleCharger || 0),
    saleSet: Number(item.saleSet || 0),
    profit: Number(item.profit || 0),
    profitCharger: Number(item.profitCharger || 0),
    profitSet: Number(item.profitSet || 0),
    actual: Number(item.actual || 0),
    actualCharger: Number(item.actualCharger || 0),
    actualSet: Number(item.actualSet || 0),
    suggested: Number(item.suggested || 0),
    suggestedSet: Number(item.suggestedSet || 0),
    suggestedCharger: Number(item.suggestedCharger || 0),
    createdBy: String(item.createdBy || '').trim(),
    productType: String(item.productType || 'viljuskar').trim(),
  };
}

app.post('/api/login', async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '').trim();

    if (!username || !password) {
      return res.status(400).json({ error: 'Korisničko ime i lozinka su obavezni.' });
    }

    const isSharedLogin = username === SHARED_LOGIN_USERNAME && password === SHARED_LOGIN_PASSWORD;
    const isLegacyLogin = username === LEGACY_LOGIN_USERNAME && password === LEGACY_LOGIN_PASSWORD;

    if (!isSharedLogin && !isLegacyLogin) {
      return res.status(401).json({ error: 'Neispravni podaci za prijavu.' });
    }

    const loginUsername = SHARED_LOGIN_USERNAME;

    const found = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE username = ?', [loginUsername], (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      });
    });

    if (!found) {
      await runSql('INSERT INTO users (username, password, role, createdAt) VALUES (?, ?, ?, ?)', [
        loginUsername,
        SHARED_LOGIN_PASSWORD,
        'user',
        new Date().toISOString(),
      ]);
    }

    return res.json({ ok: true, user: { username: loginUsername, role: 'user' } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ne mogu da prijavim korisnika.' });
  }
});

app.get('/api/calculations', async (req, res) => {
  try {
    const user = String(req.query.user || '').trim();
    if (!user) {
      return res.json([]);
    }

    const rows = await allSql('SELECT * FROM calculations WHERE createdBy = ? ORDER BY createdAt DESC', [user]);
    res.json(rows.map(normalize));
  } catch (error) {
    res.status(500).json({ error: 'Ne mogu da učitam kalkulacije' });
  }
});

app.post('/api/calculations', async (req, res) => {
  try {
    const item = normalize(req.body || {});
    const id = item.id || String(Date.now()).slice(-6);
    const createdAt = new Date().toISOString();

    await runSql(
      `INSERT INTO calculations (
        id, date, commercialist, model, customer, supplier, note,
        factory, transport, batteryWeight, other, eco, customs, purchase,
        margin, sale, profit, actual, status, createdBy, createdAt,
        productType, chargerWeight, chargerPrice, ecoCharger, customsCharger,
        purchaseCharger, marginCharger, saleCharger, profitCharger, actualCharger,
        purchaseSet, suggestedSet, saleSet, profitSet, actualSet, suggested, suggestedCharger
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        item.date || '',
        item.commercialist || '',
        item.model || '',
        item.customer || '',
        item.supplier || '',
        item.note || '',
        item.factory,
        item.transport,
        item.batteryWeight,
        item.other,
        item.eco,
        item.customs,
        item.purchase,
        item.margin,
        item.sale,
        item.profit,
        item.actual,
        item.status || 'Aktivna',
        item.createdBy || '',
        createdAt,
        item.productType || 'viljuskar',
        item.chargerWeight,
        item.chargerPrice,
        item.ecoCharger,
        item.customsCharger,
        item.purchaseCharger,
        item.marginCharger,
        item.saleCharger,
        item.profitCharger,
        item.actualCharger,
        item.purchaseSet,
        item.suggestedSet,
        item.saleSet,
        item.profitSet,
        item.actualSet,
        item.suggested,
        item.suggestedCharger,
      ]
    );

    res.status(201).json({ ok: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ne mogu da sačuvam kalkulaciju' });
  }
});

app.put('/api/calculations/:id', async (req, res) => {
  try {
    const item = normalize(req.body || {});
    const { id } = req.params;

    await runSql(
      `UPDATE calculations SET
        date = ?, commercialist = ?, model = ?, customer = ?, supplier = ?, note = ?,
        factory = ?, transport = ?, batteryWeight = ?, other = ?, eco = ?, customs = ?, purchase = ?,
        margin = ?, sale = ?, profit = ?, actual = ?, status = ?, createdBy = ?,
        productType = ?, chargerWeight = ?, chargerPrice = ?, ecoCharger = ?, customsCharger = ?,
        purchaseCharger = ?, marginCharger = ?, saleCharger = ?, profitCharger = ?, actualCharger = ?,
        purchaseSet = ?, suggestedSet = ?, saleSet = ?, profitSet = ?, actualSet = ?, suggested = ?, suggestedCharger = ?
      WHERE id = ?`,
      [
        item.date || '',
        item.commercialist || '',
        item.model || '',
        item.customer || '',
        item.supplier || '',
        item.note || '',
        item.factory,
        item.transport,
        item.batteryWeight,
        item.other,
        item.eco,
        item.customs,
        item.purchase,
        item.margin,
        item.sale,
        item.profit,
        item.actual,
        item.status || 'Aktivna',
        item.createdBy || '',
        item.productType || 'viljuskar',
        item.chargerWeight,
        item.chargerPrice,
        item.ecoCharger,
        item.customsCharger,
        item.purchaseCharger,
        item.marginCharger,
        item.saleCharger,
        item.profitCharger,
        item.actualCharger,
        item.purchaseSet,
        item.suggestedSet,
        item.saleSet,
        item.profitSet,
        item.actualSet,
        item.suggested,
        item.suggestedCharger,
        id,
      ]
    );

    res.json({ ok: true, id });
  } catch (error) {
    res.status(500).json({ error: 'Ne mogu da ažuriram kalkulaciju' });
  }
});

app.delete('/api/calculations/:id', async (req, res) => {
  try {
    await runSql('DELETE FROM calculations WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Ne mogu da obrišem kalkulaciju' });
  }
});

app.get(['/kalkulacije', '/tehnolift'], (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, host, () => {
  console.log(`Aplikacija radi na http://localhost:${port}`);
  console.log(`Server sluša na ${host}:${port}`);
  console.log(`Kratki pristup: http://localhost:${port}/kalkulacije`);
});
