const selectArchive = require('../models/selectArchiveModels');
const beforeModels = require('../models/beforeModels');
const updateModels = require('../models/updateModels');
const writeLog = require('../models/writeLog');

const archive = async (req, res) => {
    try {
        const company_id = Number(req.params.companyId);

        const result = await selectArchive(company_id);

        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка загрузки архива:', error);
        res.status(500).json({error: 'Ошибка сервера'});
    }
};

const unarchive = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { company_id, user_id } = req.body;

        if (!company_id) {
            return res.status(400).json({ error: 'company_id required' });
        }

        const beforeResult = await beforeModels.worker(id, company_id);

        const before = beforeResult.rows[0];

        if (!before) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }

        const result = await updateModels.archived(id, company_id);

        await writeLog({
            company_id,
            user_id: user_id || null,
            entity_type: 'order',
            entity_id: id,
            action: 'unarchive',
            title: `Заказ №${id} восстановлен из архива`,
            details: {
                before,
                after: result.rows[0]
            }
        });

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка восстановления заказа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

module.exports = { archive, unarchive };