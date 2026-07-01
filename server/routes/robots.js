const router = require('express').Router();
const multer = require('multer');
const ctrl = require('../controllers/robotController');
const { authenticate } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/filters', ctrl.getFilterOptions);
router.get('/filter-options', ctrl.getFilterOptions);
router.get('/barcode/:code', ctrl.getByBarcode);
router.get('/:id', ctrl.getById);
router.get('/:id/changelog', ctrl.getChangelog);

router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/image', upload.single('image'), ctrl.uploadImage);

router.post('/batch/status', ctrl.batchUpdateStatus);
router.post('/batch/delete', ctrl.batchDelete);
router.post('/batch/import', ctrl.batchImport);

module.exports = router;
