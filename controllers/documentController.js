const del = require('../models/deleteModels');
const DESC = require('../models/selectDESCModels');
const select = require('../models/selectDocumentModels');
const values = require('../models/insertValuesModels');
const buildTemplateData = require('../models/buildTemplateData');
const fs = require('fs');
const PizZip = require('pizzip');
const bwipjs = require('bwip-js');
const Docxtemplater = require('docxtemplater');
const path = require('path');
const generatedDir = path.join(__dirname, 'uploads', 'generated');

const post = async (req, res) => {
    try {
        const { company_id, user_id, name, type } = req.body;
        
        if (!company_id || !name || !req.file) {
            return res.status(400).json({ error: 'company_id, name и template обязательны' });
        }

        const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
        const result = await values.document(company_id, user_id, name, req.file.path, originalName, type);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка загрузки шаблона:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

const get = async (req, res) => {
    try {
        const companyId = Number(req.params.companyId);
        const type = req.query.type || null;

        const result = await DESC.document({companyId, type});

        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка загрузки шаблонов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

const del = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { company_id } = req.body;

        const result = await del.document({id, company_id});

        if (!result.rows[0]) {
            return res.status(404).json({ error: 'Шаблон не найден' });
        }

        const filePath = result.rows[0].file_path;
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        res.json({ message: 'Шаблон удалён' });
    } catch (error) {
        console.error('Ошибка удаления шаблона:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

const barcode = async (req, res) => {
    try {
        const png = await bwipjs.toBuffer({
            bcid: 'code128',
            text: String(req.params.text),
            scale: 3,
            height: 12,
            includetext: false
        });

        res.type('png');
        res.send(png);
    } catch (error) {
        console.error('Ошибка генерации штрихкода:', error);
        res.status(500).json({ error: 'Не удалось сгенерировать штрихкод' });
    }
};

const generate = async (req, res) => {
    try {
        const { company_id, order_id, template_id, user_id } = req.body;

        if (!company_id || !order_id || !template_id) {
            return res.status(400).json({ error: 'company_id, order_id, template_id обязательны' });
        }

        const templateResult = await select({template_id, company_id});

        const template = templateResult.rows[0];
        if (!template) {
            return res.status(404).json({ error: 'Шаблон не найден' });
        }

        const data = await buildTemplateData(company_id, order_id);

        const content = fs.readFileSync(template.file_path, 'binary');
        const zip = new PizZip(content);

        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: {
                start: '${',
                end: '}'
            }
        });

        doc.render(data);

        const buffer = doc.getZip().generate({
            type: 'nodebuffer',
            compression: 'DEFLATE'
        });

        const outputPath = path.join(
            generatedDir,
            `document-${company_id}-${order_id}-${template_id}-${Date.now()}.docx`
        );

        fs.writeFileSync(outputPath, buffer);

        await values.generate({company_id, order_id, template_id, user_id, outputPath});

        res.download(outputPath);
    } catch (error) {
        console.error('Ошибка генерации документа:', error);
        res.status(500).json({
            error: 'Ошибка генерации документа',
            details: error.message
        });
    }
};

module.exports = { get, post, del, barcode, generate };