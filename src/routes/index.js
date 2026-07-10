const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');
const adminRoutes = require('./admin');
const studentRoutes = require('./student');
const recruiterRoutes = require('./recruiter');
const jobRoutes = require('./jobs');
const applicationRoutes = require('./applications');
const tenantRoutes = require('./tenant');
const platformAdminRoutes = require('./platformAdmin');
const searchRoutes = require('./search');

router.use('/auth', authRoutes);
router.use('/tenant', tenantRoutes);
router.use('/platform', platformAdminRoutes);
router.use('/admin', adminRoutes);
router.use('/students', studentRoutes);
router.use('/recruiters', recruiterRoutes);
router.use('/jobs', jobRoutes);
router.use('/applications', applicationRoutes);
router.use('/search', searchRoutes);

module.exports = router;
