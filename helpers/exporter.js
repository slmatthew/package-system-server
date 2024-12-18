const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const db = require('../helpers/databases');

const finalizeExport = async (res, rows, file_name) => {
    // Создание новой рабочей книги
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Table');

    // Добавление заголовков
    if (rows.length > 0) {
      worksheet.columns = Object.keys(rows[0]).map((key) => ({
        header: key,
        key: key,
        width: 20, // ширина колонок
      }));

      // Добавление данных
      rows.forEach((row) => {
        worksheet.addRow(row);
      });
    }

    const exportsDir = path.join(__dirname, 'helpers', 'exports');
    if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true }); // Создаем директорию (включая родительские, если нужно)
    }

    // Путь к файлу
    const filePath = path.join(exportsDir, `${file_name}.xlsx`);

    await workbook.xlsx.writeFile(filePath);

    // Отправка файла клиенту
    res.download(filePath, `${file_name}.xlsx`, (err) => {
      if (err) {
        console.error(err);
      }
      fs.unlinkSync(filePath); // Удаляем файл после загрузки
    });
};

const exporter = {};

exporter.packages = async (req, res) => {
    try {
        const query = `
            SELECT 
                p.*,
                pt.value AS package_type,
                CONCAT(sender.first_name, ' ', sender.last_name) AS sender_name,
                CONCAT(receiver.first_name, ' ', receiver.last_name) AS receiver_name,
                (SELECT ps.value 
                FROM status_history sh
                LEFT JOIN package_statuses ps ON sh.status_id = ps.id
                WHERE sh.tracking_number = p.tracking_number
                ORDER BY sh.recorded_at DESC
                LIMIT 1) AS last_status,
                (SELECT sh.recorded_at 
                FROM status_history sh
                WHERE sh.tracking_number = p.tracking_number
                ORDER BY sh.recorded_at DESC
                LIMIT 1) AS last_status_date,
                (SELECT sh.status_id 
                FROM status_history sh
                WHERE sh.tracking_number = p.tracking_number
                ORDER BY sh.recorded_at DESC
                LIMIT 1) AS last_status_id
            FROM packages p
            LEFT JOIN users sender ON p.sender_id = sender.id
            LEFT JOIN users receiver ON p.receiver_id = receiver.id
            LEFT JOIN package_types pt ON p.type_id = pt.id
            ORDER BY created_at DESC
        `;

        const [rows] = await db.execute(query, []);
    
        finalizeExport(res, rows, 'packages');
    } catch (error) {
        console.error('Ошибка экспорта:', error);
        res.status(500).json({ error: error.message });
    }
};

exporter.users = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT id, first_name, last_name, username, address, role FROM users', []);
    
        finalizeExport(res, rows, 'users');
    } catch (error) {
        console.error('Ошибка экспорта:', error);
        res.status(500).json({ error: error.message });
    }
};

exporter.packageStatuses = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM package_statuses ORDER BY id ASC', []);
    
        finalizeExport(res, rows, 'package_statuses');
    } catch (error) {
        console.error('Ошибка экспорта:', error);
        res.status(500).json({ error: error.message });
    }
};

exporter.packageTypes = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM package_types ORDER BY id ASC', []);
    
        finalizeExport(res, rows, 'package_types');
    } catch (error) {
        console.error('Ошибка экспорта:', error);
        res.status(500).json({ error: error.message });
    }
};

exporter.statusHistory = async (req, res) => {
    try {
        const query = `
            SELECT sh.*, ps.value as status_value, f.name as facility_name 
            FROM status_history sh
            JOIN package_statuses ps ON sh.status_id = ps.id
            JOIN facilities f ON sh.facility_id = f.id
        `;

        const [rows] = await db.execute(query, []);
    
        finalizeExport(res, rows, 'status_history');
    } catch (error) {
        console.error('Ошибка экспорта:', error);
        res.status(500).json({ error: error.message });
    }
};

exporter.facilities = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM facilities', []);
    
        finalizeExport(res, rows, 'facilities');
    } catch (error) {
        console.error('Ошибка экспорта:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = exporter;
