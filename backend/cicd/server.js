const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Configure AWS S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Configure Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

app.use(express.json());
// Enable CORS for all origins and handle preflight
app.use(cors());
// app.options('*', cors());

// API endpoints for managing results, suites, and tests

// Create a new result (PR test run)
app.post('/results', async (req, res) => {
  try {
    const { prLink, prName } = req.body;
    
    const { data, error } = await supabase
      .from('results')
      .insert([{ 
        'pr-link': prLink, 
        'pr-name': prName,
        'res-success': false
      }])
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Result created successfully',
      data: data
    });
  } catch (error) {
    console.error('Error creating result:', error);
    res.status(500).json({ error: 'Failed to create result' });
  }
});

// Update result success status
app.patch('/results/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { resSuccess } = req.body;
    
    const { data, error } = await supabase
      .from('results')
      .update({ 'res-success': resSuccess })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Result updated successfully',
      data: data
    });
  } catch (error) {
    console.error('Error updating result:', error);
    res.status(500).json({ error: 'Failed to update result' });
  }
});

// Get all results
app.get('/results', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('results')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// Create a new test suite
app.post('/suites', async (req, res) => {
  try {
    const { resultId, name, s3Link, suitesSuccess } = req.body;
    
    const { data, error } = await supabase
      .from('suites')
      .insert([{ 
        id: resultId,
        name: name,
        's3-link': s3Link,
        'suites-success': suitesSuccess || false
      }])
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Suite created successfully',
      data: data
    });
  } catch (error) {
    console.error('Error creating suite:', error);
    res.status(500).json({ error: 'Failed to create suite' });
  }
});

// Update suite success status and S3 link
app.patch('/suites/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { suitesSuccess, s3Link } = req.body;
    
    const updateData = {};
    if (suitesSuccess !== undefined) updateData['suites-success'] = suitesSuccess;
    if (s3Link !== undefined) updateData['s3-link'] = s3Link;
    
    const { data, error } = await supabase
      .from('suites')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Suite updated successfully',
      data: data
    });
  } catch (error) {
    console.error('Error updating suite:', error);
    res.status(500).json({ error: 'Failed to update suite' });
  }
});

// Get suites for a specific result
app.get('/results/:id/suites', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('suites')
      .select('*')
      .eq('result_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error fetching suites:', error);
    res.status(500).json({ error: 'Failed to fetch suites' });
  }
});

// Create a new test
app.post('/tests', async (req, res) => {
  try {
    const { suiteId, name, summary, testSuccess } = req.body;
    
    const { data, error } = await supabase
      .from('tests')
      .insert([{ 
        id: suiteId,
        name: name,
        summary: summary,
        'test-success': testSuccess || false
      }])
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Test created successfully',
      data: data
    });
  } catch (error) {
    console.error('Error creating test:', error);
    res.status(500).json({ error: 'Failed to create test' });
  }
});

// Update test success status
app.patch('/tests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { testSuccess, summary } = req.body;
    
    const updateData = {};
    if (testSuccess !== undefined) updateData['test-success'] = testSuccess;
    if (summary !== undefined) updateData['summary'] = summary;
    
    const { data, error } = await supabase
      .from('tests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Test updated successfully',
      data: data
    });
  } catch (error) {
    console.error('Error updating test:', error);
    res.status(500).json({ error: 'Failed to update test' });
  }
});

// Get single suite 
app.get('/suites/:suiteId', async (req, res) => {
  try {
    const { suiteId } = req.params;
    
    const { data, error } = await supabase
      .from('suites')
      .select('*')
      .eq('id', suiteId)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error fetching suite:', error);
    res.status(500).json({ error: 'Failed to fetch suite' });
  }
});


// Get tests for a specific suite
app.get('/suites/:id/tests', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('tests')
      .select('*')
      .eq('suite_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error fetching tests:', error);
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
});

// S3 Video Upload Endpoint
app.post('/upload-video', upload.single('video'), async (req, res) => {
  try {
    console.log('Uploading video');
    console.log(req.file);
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const fileName = `video_${Date.now()}_${req.file.originalname}`;
    console.log(fileName);
    
    const uploadParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);
    console.log('Video uploaded to S3');

    const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    console.log(fileUrl);

    res.json({
      success: true,
      message: 'Video uploaded successfully',
      fileUrl: fileUrl,
      fileName: fileName
    });
  } catch (error) {
    console.error('Error uploading video:', error);
    res.status(500).json({ error: 'Failed to upload video' });
  }
});

// Supabase JSON POST Endpoint
app.post('/upload-data', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from(process.env.SUPABASE_TABLE_NAME)
      .insert([req.body]);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Data uploaded successfully',
      data: data
    });
  } catch (error) {
    console.error('Error uploading data:', error);
    res.status(500).json({ error: 'Failed to upload data' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});