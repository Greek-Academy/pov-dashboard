const fs = require('node:fs');
const path = require('node:path');
const { Writable } = require('node:stream');
const csv = require('csv-parser');
const { pipeline } = require('node:stream/promises');

class PovImporter extends Writable {
  tableName = '';
  conn = null;

  constructor(mysql, tableName) {
    super({
      objectMode: true,
    });
    this.tableName = tableName;
    this.conn = mysql;
  }

  async _write(chunk, _, callback) {
    await this.conn.query(`
      insert into ${this.tableName}
      (country_name,country_code,series,YR2019,YR2020,YR2021,YR2022,YR2023)
      values (?,?,?,?,?,?,?,?)
    `, [
      chunk['Country Name'],
      chunk['Country Code'],
      chunk['Series Name'],
      chunk['2019 [YR2019]'] === '..' || chunk['2019 [YR2019]'] === '' ? null : chunk['2019 [YR2019]'],
      chunk['2020 [YR2020]'] === '..' || chunk['2020 [YR2020]'] === '' ? null : chunk['2020 [YR2020]'],
      chunk['2021 [YR2021]'] === '..' || chunk['2021 [YR2021]'] === '' ? null : chunk['2021 [YR2021]'],
      chunk['2022 [YR2022]'] === '..' || chunk['2022 [YR2022]'] === '' ? null : chunk['2022 [YR2022]'],
      chunk['2023 [YR2023]'] === '..' || chunk['2023 [YR2023]'] === '' ? null : chunk['2023 [YR2023]']
    ]);

    callback();
  }

  static _createTable = async (conn, tableName) => {
    await conn.query(`DROP TABLE IF EXISTS ${tableName};`)
    await conn.query(`CREATE TABLE ${tableName} (
      pov_id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
      country_name VARCHAR(255),
      country_code VARCHAR(3),
      series VARCHAR(255),
      YR2019 FLOAT,
      YR2020 FLOAT,
      YR2021 FLOAT,
      YR2022 FLOAT,
      YR2023 FLOAT)`
    );
  }

  static fromCsv = async (params) => {
    const filename = params.dirent.name;
    const [dollar] = path.basename(filename).split(/[\-\.]/);
    const tableName = `pov_${dollar}`;
  
    const reader = fs.createReadStream(`${params.dirent.parentPath}/${filename}`);
    const parser = csv();
    const csvImporter = new PovImporter(params.conn, tableName);
  
    // テーブルの作成
    await PovImporter._createTable(params.conn, tableName);
  
    // トランザクションの開始
    // await params.conn.query('.....');
  
    await pipeline(
      // CSVファイルから読み込む
      reader,
      // CSVファイルのパース
      parser,
      // データベースに取り込む
      csvImporter,
    );
  
    // コミットする
    // await params.conn.query('....');
  }
}

module.exports = {
  PovImporter,
};
