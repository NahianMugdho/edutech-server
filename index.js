require('dotenv').config()


const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb'); // For _id usage in PATCH


const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 3000;


app.use(cors())
app.use(express.json()); // This enables JSON parsing



const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_pass}@cluster0.qvjt0ww.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const SSLCommerzPayment = require("sslcommerz-lts");
const { v4: uuidv4 } = require("uuid");

const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASSWORD;
const is_live = false; // sandbox = false, live = true


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// ✅ JWT Verify Middleware
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) return res.status(401).send({ error: 'No token provided' });

  const token = authHeader.split(' ')[1]; // "Bearer token"
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).send({ error: 'Unauthorized' });
    req.user = decoded;
    next();
  });
};

// Middleware to get a user by ID (used for superadmin protection)
const getUserById = async (id, db) => {
  try {
    const objectId = new ObjectId(id);
    const user = await db.collection("users").findOne({ _id: objectId });
    return user;
  } catch (error) {
    return null;
  }
};


// Middleware to verify if the user is an admin
const verifyAdmin = async (req, res, next) => {
  try {
    const userId = req.user?._id;

    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(401).send({ error: 'Unauthorized: Invalid user ID' });
    }

    const db = client.db('Edutech');
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });

    if (!user || user.role !== 'admin') {
      return res.status(403).send({ error: 'Forbidden: Admins only' });
    }

    next();
  } catch (err) {
    console.error('verifyAdmin failed:', err);
    res.status(500).send({ error: 'Internal Server Error (admin check)' });
  }
};



async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    //products



const userCollection = client.db('Edutech').collection('users');
   // ✅ Create JWT token route
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const payload = {
        email: user.email,
        
        role: user.role || 'student'
      };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.send({ token });
    });




//user
app.get('/users', async (req, res) => {
 
  try {
    const users = await userCollection.find().toArray();
    res.send(users);
  } catch (error) {
    res.status(500).send({ message: 'Error fetching users' });
  }
});


app.post('/users', async (req, res) => {
  const { name, email,photo } = req.body;
  const existingUser = await userCollection.findOne({ email });

  if (existingUser) {
    return res.send({ message: 'User already exists', insertedId: null });
  }

  const result = await userCollection.insertOne({
    name,
    email,
    photo,
    role: 'student' // ✅ Everyone starts as student/general
  });

  res.send(result);
});






// Check if user is admin
app.get('/users/admin/:email', async (req, res) => {
  const email = req.params.email;
  const user = await userCollection.findOne({ email: email });
  const isAdmin = user?.role === 'admin';
  res.send({ admin: isAdmin });
});

const verifyAdmin = async (req, res, next) => {
  const email = req.user?.email;

  const user = await userCollection.findOne({ email: email });

  if (user?.role !== 'admin') {
    return res.status(403).send({ error: 'Forbidden: Admins only' });
  }

  next();
};






//kaium

// Assuming you have MongoDB db connection and userCollection set up
app.get('/users/role/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const user = await db.collection('users').findOne({ email: email });
    if (!user) {
      return res.status(404).send({ error: 'User not found' });
    }
    res.send({ role: user.role });
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch user role' });
  }
});


// ✅ GET: Check if user is a teacher
app.get('/users/teacher/:email', async (req, res) => {
  const email = req.params.email;
  const user = await userCollection.findOne({ email });
  const isTeacher = user?.role === 'teacher';
  res.send({ teacher: isTeacher });
});


// ✅ PATCH: Update user role (e.g. from student to admin/teacher)
app.patch('/users/role/:id', verifyToken, verifyAdmin, async (req, res) => {
  const id = req.params.id;
  const { role } = req.body;

  if (!['admin', 'teacher', 'student'].includes(role)) {
    return res.status(400).send({ error: 'Invalid role' });
  }

  const targetUser = await userCollection.findOne({ _id: new ObjectId(id) });

  // ✅ Prevent modifying superadmin
  if (targetUser?.superadmin) {
    return res.status(403).send({ error: 'Forbidden: Cannot change role of a superadmin' });
  }

  const result = await userCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { role: role } }
  );

  res.send(result);
});

// ✅ DELETE: Remove a user (admin only)
app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
  const id = req.params.id;

  try {
    const targetUser = await userCollection.findOne({ _id: new ObjectId(id) });

    // ✅ Prevent deleting superadmin
    if (targetUser?.superadmin) {
      return res.status(403).send({ error: 'Forbidden: Cannot delete a superadmin' });
    }

    const result = await userCollection.deleteOne({ _id: new ObjectId(id) });
    res.send(result);
  } catch (error) {
    console.error("Failed to delete user:", error);
    res.status(500).send({ error: "Failed to delete user" });
  }
});


const teacherCollection = client.db('Edutech').collection('teachers');
// const userCollection = client.db('Edutech').collection('users');

// ✅ Get all teacher profiles (public)
app.get('/teachers', async (req, res) => {
  try {
    const teachers = await teacherCollection.find().toArray();
    res.send(teachers);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch teachers' });
  }
});

// Add a new teacher profile (admin only)
app.post('/teachers', async (req, res) => {
  try {
    const {
      name,
      subject,
      description,
      image,
      designation,
      education,
      experience,
      fieldOfInterest,
      email,
      linkedin,
      courses,
      courseLinks,
      bio,
      userEmail
    } = req.body;

    const user = await userCollection.findOne({ email: userEmail });
    if (!user || user.role !== 'admin') {
      return res.status(403).send({ error: 'Unauthorized access' });
    }

    const newTeacher = {
      name,
      subject,
      description,
      image,
      designation,
      education,
      experience,
      fieldOfInterest,
      email,
      linkedin,
      courses,
      courseLinks,
      bio
    };

    const result = await teacherCollection.insertOne(newTeacher);
    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to add teacher' });
  }
});

// Update a teacher profile (admin only)
app.put('/teachers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      subject,
      description,
      image,
      designation,
      education,
      experience,
      fieldOfInterest,
      email,
      linkedin,
      courses,
      courseLinks,
      bio,
      userEmail
    } = req.body;

    const user = await userCollection.findOne({ email: userEmail });
    if (!user || user.role !== 'admin') {
      return res.status(403).send({ error: 'Unauthorized access' });
    }

    const updatedTeacher = {
      $set: {
        name,
        subject,
        description,
        image,
        designation,
        education,
        experience,
        fieldOfInterest,
        email,
        linkedin,
        courses,
        courseLinks,
        bio
      }
    };

    const result = await teacherCollection.updateOne(
      { _id: new ObjectId(id) },
      updatedTeacher
    );

    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to update teacher profile' });
  }
});


// ✅ Delete a teacher profile (admin only)
app.delete('/teachers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userEmail } = req.body;

    // ✅ Check if the user is an admin
    const user = await userCollection.findOne({ email: userEmail });
    if (!user || user.role !== 'admin') {
      return res.status(403).send({ error: 'Unauthorized access' });
    }

    const result = await teacherCollection.deleteOne({ _id: new ObjectId(id) });
    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to delete teacher profile' });
  }
});








//kaium

//for updateProfilePicture.jsx from FE
app.patch('/users/:email', async (req, res) => {
  const email = req.params.email;
  const { photo } = req.body;

  const result = await userCollection.updateOne(
    { email },
    { $set: { photo } }
  );

  res.send(result);
});


// Inside your run() function in backend
const videoCollection = client.db('Edutech').collection('videos');

// ✅ Route: Add new course with videos (Admin only)
app.post('/videos', verifyToken, verifyAdmin, async (req, res) => {
  const course = req.body;
  try {
    const result = await videoCollection.insertOne(course);
    res.send(result);
  } catch (err) {
    res.status(500).send({ error: 'Failed to insert course' });
  }
});

// ✅ PATCH: Approve a course
app.patch('/videos/approve/:id', verifyToken, verifyAdmin, async (req, res) => {
  const id = req.params.id;
  try {
    const result = await videoCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'approved' } }
    );
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to approve course' });
  }
});

app.get('/videos', async (req, res) => {
  try {
    const videos = await videoCollection.find().toArray();
    res.send(videos);
  } catch (error) {
    res.status(500).send({ message: 'Error fetching videos' });
  }
});


//kaium
// ✅ DELETE: Remove a course from DB
app.delete('/videos/:id', verifyToken, verifyAdmin, async (req, res) => {
  const id = req.params.id;
  try {
    const result = await videoCollection.deleteOne({ _id: new ObjectId(id) });
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to delete course' });
  }
});

// ✅ Get single course by ID (with validation)
app.get('/videos/:id', async (req, res) => {
  const { id } = req.params;

  // Check if ID is a valid ObjectId
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid course ID" });
  }

  try {
    const course = await videoCollection.findOne({ _id: new ObjectId(id) });

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    res.json(course);
  } catch (error) {
    console.error("Error fetching course by ID:", error);
    res.status(500).json({ error: "Server error while fetching course" });
  }
});

app.patch('/videos/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  try {
    // 1. Update course data
    const result = await videoCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData }
    );

    // 2. Find enrolled users for this course (approved enrollments)
    const enrolledUsers = await enrollCollection
      .find({ courseId: id, status: 'approved' })
      .toArray();

    // 3. Create notifications for each enrolled user
    const notifications = enrolledUsers.map(user => ({
      recipientEmail: user.userEmail,
      type: 'course_update',
      title: 'Course Updated',
      message: `The course "${updatedData.title || 'a course'}" has been updated.`,
      read: false,
      timestamp: new Date(),
    }));

    if (notifications.length > 0) {
      await notificationCollection.insertMany(notifications);
    }

    // 4. Respond success
    res.send(result);
  } catch (err) {
    console.error("Error updating course:", err);
    res.status(500).send({ error: "Failed to update course" });
  }
});

// ✅ PATCH: Toggle featured status (max 6 featured allowed)
app.patch('/videos/feature/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { featured } = req.body;

  try {
    const targetCourse = await videoCollection.findOne({ _id: new ObjectId(id) });

    if (!targetCourse) {
      return res.status(404).send({ error: "Course not found" });
    }

    // ✅ If setting to true → limit max 6 featured courses
    if (featured) {
      const featuredCount = await videoCollection.countDocuments({ featured: true });
      if (featuredCount >= 6) {
        return res.status(400).send({ error: "You can only feature up to 6 courses" });
      }
    }

    const result = await videoCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { featured } }
    );

    res.send(result);
  } catch (err) {
    console.error("Feature toggle error:", err);
    res.status(500).send({ error: "Server error" });
  }
});

const commentCollection = client.db('Edutech').collection('comments');
const progressCollection = client.db('Edutech').collection('progress');

// ✅ Add Comment
app.post('/comments', verifyToken, async (req, res) => {
  const comment = req.body;
  comment.timestamp = new Date();
  const result = await commentCollection.insertOne(comment);
  res.send(result);
});

// ✅ Get Comments by Course
app.get('/comments/:courseId', async (req, res) => {
  const courseId = req.params.courseId;
  const comments = await commentCollection.find({ courseId }).sort({ timestamp: -1 }).toArray();
  res.send(comments);
});

// ✅ Update Comment
app.patch('/comments/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  const result = await commentCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { text, edited: true } }
  );
  res.send(result);
});

// ✅ Delete Comment
app.delete('/comments/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const result = await commentCollection.deleteOne({ _id: new ObjectId(id) });
  res.send(result);
});

// ✅ Update Video Progress
app.post('/progress', verifyToken, async (req, res) => {
  const { courseId, userEmail, videoUrl } = req.body;

  await progressCollection.updateOne(
    { courseId, userEmail },
    { $addToSet: { completedVideos: videoUrl } }, // no duplicates
    { upsert: true }
  );

  res.send({ success: true });
});

// ✅ Get Progress
app.get('/progress', verifyToken, async (req, res) => {
  const { courseId, userEmail } = req.query;
  const progress = await progressCollection.findOne({ courseId, userEmail });
  res.send(progress || { completedVideos: [] });
});



// notification
const { ObjectId } = require('mongodb');
const notificationCollection = client.db('Edutech').collection('notifications');

// ✅ POST: Create a new notification
app.post('/notifications', verifyToken, async (req, res) => {
  try {
    const notification = {
      ...req.body,
      read: false,
      timestamp: new Date()
    };
    const result = await notificationCollection.insertOne(notification);
    res.send(result);
  } catch (err) {
    console.error("Failed to create notification:", err);
    res.status(500).send({ error: "Failed to create notification" });
  }
});

// ✅ GET: Fetch notifications for a specific user (only by email)
app.get('/notifications', verifyToken, async (req, res) => {
  const { email } = req.query;
  try {
    if (!email) {
      return res.status(400).send({ error: "Missing email in query" });
    }

    const notifications = await notificationCollection
      .find({ recipientEmail: email })
      .sort({ timestamp: -1 })
      .toArray();

    res.send(notifications);
  } catch (err) {
    console.error("Failed to fetch notifications:", err);
    res.status(500).send({ error: "Failed to fetch notifications" });
  }
});

// ✅ PATCH: Mark a notification as read
app.patch('/notifications/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await notificationCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { read: true } }
    );
    res.send(result);
  } catch (err) {
    console.error("Failed to mark notification as read:", err);
    res.status(500).send({ error: "Failed to update notification" });
  }
});


// enrollments
// Load from .env
const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASSWORD;
const is_live = false; // true for production

// Required packages
const SSLCommerzPayment = require("sslcommerz-lts");
const { v4: uuidv4 } = require("uuid");

// ✅ POST: Initiate SSLCommerz payment session
app.post("/initiate-payment", verifyToken, async (req, res) => {
  const { courseId, courseTitle, price, userEmail, phone } = req.body;

  if (!courseId || !userEmail || !price) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const transactionId = uuidv4();

  const data = {
    total_amount: price,
    currency: "BDT",
    tran_id: transactionId,
    success_url: process.env.SSL_SUCCESS_URL,
    fail_url: process.env.SSL_FAIL_URL,
    cancel_url: process.env.SSL_CANCEL_URL,
    ipn_url: process.env.SSL_IPN_URL,
    product_name: courseTitle,
    cus_name: userEmail,
    cus_email: userEmail,
    cus_add1: "N/A",
    cus_phone: phone || "N/A",
    shipping_method: "NO",
    product_category: "Course",
    product_profile: "general",
  };

  try {
    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    const apiResponse = await sslcz.init(data);

    // Save a pending enrollment request
    const enrollDoc = {
      courseId,
      courseTitle,
      userEmail,
      phone,
      status: "pending",
      method: "sslcommerz",
      transactionId,
      timestamp: new Date(),
    };

    await enrollCollection.insertOne(enrollDoc);

    if (apiResponse?.GatewayPageURL) {
      res.send({ url: apiResponse.GatewayPageURL });
    } else {
      res.status(400).json({ error: "Payment session failed" });
    }
  } catch (error) {
    console.error("Payment initiation error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ GET: Payment Success Handler
// ✅ POST: Payment Success Callback (for SSLCommerz)
app.post("/payment-success", async (req, res) => {
  const { tran_id, val_id, amount, status } = req.body;

  try {
    await enrollCollection.updateOne(
      { transactionId: tran_id },
      {
        $set: {
          status: "approved",
          paymentStatus: "success",
          val_id,
        },
      }
    );

    // Optionally: send user notification (if not yet added)
    await sendNotification({
      userEmail: req.body.cus_email,
      title: "Enrollment Successful",
      message: `Your payment for ${req.body.product_name} was successful.`,
    });

    // Redirect to frontend success page
    res.redirect(`https://bornobyte-bd.web.app/payment-success?tran_id=${tran_id}`);
  } catch (err) {
    console.error("Success update error:", err);
    res.redirect("https://bornobyte-bd.web.app/payment-failed");
  }
});


// ✅ GET: Payment Failure Handler
app.get("/payment-fail", async (req, res) => {
  const { tran_id } = req.query;

  try {
    await enrollCollection.updateOne(
      { transactionId: tran_id },
      { $set: { status: "failed", paymentStatus: "failed" } }
    );
  } catch (err) {
    console.error("Fail update error:", err);
  }

  res.redirect("https://bornobyte-bd.web.app/payment-failed");
});

// ✅ GET: Payment Cancel Handler
app.get("/payment-cancel", async (req, res) => {
  const { tran_id } = req.query;

  try {
    await enrollCollection.updateOne(
      { transactionId: tran_id },
      { $set: { status: "cancelled", paymentStatus: "cancelled" } }
    );
  } catch (err) {
    console.error("Cancel update error:", err);
  }

  res.redirect("https://bornobyte-bd.web.app/payment-cancel");
});

// ✅ Optional: POST IPN handler for server-to-server confirmation
app.post("/ipn-handler", async (req, res) => {
  const { tran_id, status } = req.body;

  try {
    await enrollCollection.updateOne(
      { transactionId: tran_id },
      { $set: { paymentStatus: status || "ipn-notified" } }
    );

    res.status(200).send("IPN received");
  } catch (err) {
    console.error("IPN handler error:", err);
    res.status(500).send("Error handling IPN");
  }
});

const blogCollection = client.db('Edutech').collection('blogs');

// ✅ Create Blog Post
app.post('/blogs', verifyToken, verifyAdmin, async (req, res) => {
  const blog = req.body;
  blog.timestamp = new Date();

  try {
    const result = await blogCollection.insertOne(blog);
    res.send(result);
  } catch (err) {
    console.error('Failed to create blog:', err);
    res.status(500).send({ error: 'Failed to create blog' });
  }
});


// ✅ Get All Blogs
app.get('/blogs', async (req, res) => {
  try {
    const blogs = await blogCollection.find().sort({ timestamp: -1 }).toArray();
    res.send(blogs);
  } catch (err) {
    console.error('Failed to fetch blogs:', err);
    res.status(500).send({ error: 'Failed to fetch blogs' });
  }
});

// ✅ Get Single Blog
app.get('/blogs/:id', async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid blog ID" });

  try {
    const blog = await blogCollection.findOne({ _id: new ObjectId(id) });
    if (!blog) return res.status(404).json({ error: "Blog not found" });
    res.json(blog);
  } catch (error) {
    console.error("Error fetching blog by ID:", error);
    res.status(500).json({ error: "Server error while fetching blog" });
  }
});

// ✅ Update Blog
app.patch('/blogs/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  try {
    const result = await blogCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData }
    );
    res.send(result);
  } catch (err) {
    console.error("Error updating blog:", err);
    res.status(500).send({ error: "Failed to update blog" });
  }
});

// ✅ Delete Blog
app.delete('/blogs/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await blogCollection.deleteOne({ _id: new ObjectId(id) });
    res.send(result);
  } catch (error) {
    console.error("Failed to delete blog:", error);
    res.status(500).send({ error: "Failed to delete blog" });
  }
});


// Review and Rating System (where user can give only one review per course and can update and delete it. Also admin can delete any review)
const reviewCollection = client.db('Edutech').collection('reviews');

// ✅ POST: Add a review
app.post('/reviews', verifyToken, async (req, res) => {
  const { courseId, rating, comment } = req.body;
  const userEmail = req.user.email; // from JWT
  const userName = req.user.name; // Fallback if name not provided

  try {
    // Check if already reviewed
    const existingReview = await reviewCollection.findOne({ userEmail, courseId });
    if (existingReview) {
      return res.status(400).send({ error: 'You have already reviewed this course' });
    }

    const review = {
      courseId,
      rating: Number(rating),
      comment,
      userName,
      userEmail,
      timestamp: new Date()
    };

    const result = await reviewCollection.insertOne(review);
    res.send(result);
  } catch (err) {
    console.error('Failed to add review:', err);
    res.status(500).send({ error: 'Failed to add review' });
  }
});

// ✅ GET: Fetch reviews for a course
app.get('/reviews/:courseId', async (req, res) => {
  const { courseId } = req.params;

  try {
    const reviews = await reviewCollection
      .find({ courseId })
      .sort({ timestamp: -1 })
      .toArray();
    res.send(reviews);
  } catch (err) {
    console.error('Failed to fetch reviews:', err);
    res.status(500).send({ error: 'Failed to fetch reviews' });
  }
});

// ✅ GET: Average rating for a course
app.get('/reviews/:courseId/average', async (req, res) => {
  const { courseId } = req.params;

  try {
    const result = await reviewCollection.aggregate([
      { $match: { courseId } },
      { $group: { _id: null, avgRating: { $avg: "$rating" }, count: { $sum: 1 } } }
    ]).toArray();

    if (result.length === 0) {
      return res.send({ avgRating: 0, count: 0 });
    }

    res.send({ avgRating: result[0].avgRating, count: result[0].count });
  } catch (err) {
    console.error('Failed to fetch average rating:', err);
    res.status(500).send({ error: 'Failed to fetch average rating' });
  }
});

// ✅ PATCH: Update a review (user can only update their own)
app.patch('/reviews/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;
  const userEmail = req.user.email;
  const userName = req.user.name; // Fallback if name not provided

  try {
    const result = await reviewCollection.updateOne(
      { _id: new ObjectId(id), userEmail, userName }, // Ensure only the owner can update
      { $set: { rating: Number(rating), comment, timestamp: new Date() } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).send({ error: 'Review not found or not updated' });
    }

    res.send(result);
  } catch (err) {
    console.error('Failed to update review:', err);
    res.status(500).send({ error: 'Failed to update review' });
  }
});

// ✅ DELETE: Admin can delete any review
app.delete('/reviews/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await reviewCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).send({ error: 'Review not found' });
    }
    res.send(result);
  } catch (err) {
    console.error('Failed to delete review:', err);
    res.status(500).send({ error: 'Failed to delete review' });
  }
});

//❤️ Favorite courses collection
const favoriteCollection = client.db('Edutech').collection('favorites');

// ✅ POST: Add a course to favorites
app.post('/favorites', verifyToken, async (req, res) => {
  let { courseId } = req.body;
  const userEmail = req.user.email.toLowerCase();

  if (!courseId || typeof courseId !== 'string' || courseId.trim() === '') {
    return res.status(400).send({ error: 'Invalid or missing courseId' });
  }
  courseId = courseId.trim();

  try {
    // Check if already favorited
    const existingFavorite = await favoriteCollection.findOne({ userEmail, courseId });
    if (existingFavorite) {
      return res.status(400).send({ error: 'This course is already in your favorites' });
    }

    const favorite = {
      userEmail,
      courseId,
      timestamp: new Date(),
    };

    await favoriteCollection.insertOne(favorite);
    res.send({ message: 'Added to favorites' });
  } catch (err) {
    console.error('Failed to add favorite:', err);
    res.status(500).send({ error: 'Failed to add favorite' });
  }
});

// ✅ GET: Fetch favorite courses for a user
app.get('/favorites', verifyToken, async (req, res) => {
  const userEmail = req.user.email.toLowerCase();

  try {
    const favorites = await favoriteCollection.find({ userEmail }).toArray();
    res.send(favorites);
  } catch (err) {
    console.error('Failed to fetch favorites:', err);
    res.status(500).send({ error: 'Failed to fetch favorites' });
  }
});

// ✅ DELETE: Remove a course from favorites
app.delete('/favorites/:courseId', verifyToken, async (req, res) => {
  let { courseId } = req.params;
  const userEmail = req.user.email.toLowerCase();

  if (!courseId || typeof courseId !== 'string' || courseId.trim() === '') {
    return res.status(400).send({ error: 'Invalid or missing courseId' });
  }
  courseId = courseId.trim();

  try {
    const result = await favoriteCollection.deleteOne({ userEmail, courseId });
    if (result.deletedCount === 0) {
      return res.status(404).send({ error: 'Favorite not found' });
    }
    res.send({ message: 'Removed from favorites' });
  } catch (err) {
    console.error('Failed to remove favorite:', err);
    res.status(500).send({ error: 'Failed to remove favorite' });
  }
});







//kaium

const enrollCollection = client.db('Edutech').collection('enrollRequests');
// ✅ POST: Enroll in a course
// POST: User Enrollment Request
app.post('/enrollRequests', verifyToken, async (req, res) => {
  const enrollment = req.body;

  try {
    // Check if user already requested this course
    const existing = await enrollCollection.findOne({
      userEmail: enrollment.userEmail,
      courseId: enrollment.courseId,
    });

    if (existing?.status === 'approved') {
      return res.status(400).send({ error: 'You are already enrolled in this course' });
    }

    if (existing?.status === 'pending') {
      return res.status(400).send({ error: 'You already submitted an enrollment request for this course' });
    }

    enrollment.status = 'pending'; // Initial status
    enrollment.timestamp = new Date();

    const result = await enrollCollection.insertOne(enrollment);
    res.send(result);
  } catch (err) {
    console.error('Enroll error:', err);
    res.status(500).send({ error: 'Failed to submit enrollment request' });
  }
});


// GET: Fetch all enroll requests
app.get('/enrollRequests', verifyToken, async (req, res) => {
  try {
    const requests = await enrollCollection.find().toArray();
    res.send(requests);
  } catch (err) {
    console.error('Failed to get enrollment requests', err);
    res.status(500).send({ error: 'Failed to get enrollment requests' });
  }
});
// ✅ PATCH: Approve enrollment request and send notification
app.patch('/enrollRequests/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    // 1. Update enrollment status
    const result = await enrollCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: status || 'approved' } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).send({ error: "Enrollment request not found or not updated" });
    }

    // 2. If status is approved, send notification to the user
    if ((status || 'approved') === 'approved') {
      // Get the enrollment request details to know user email and course title
      const enrollment = await enrollCollection.findOne({ _id: new ObjectId(id) });

      if (enrollment) {
        const notification = {
          recipientEmail: enrollment.userEmail,
          type: 'enrollment_approved',
          title: 'Enrollment Approved',
          message: `Your enrollment request for the course "${enrollment.courseTitle}" has been approved.`,
          read: false,
          timestamp: new Date(),
        };
        await notificationCollection.insertOne(notification);
      }
    }

    // 3. Send success response
    res.send(result);
  } catch (err) {
    console.error('Failed to update enrollment request or send notification', err);
    res.status(500).send({ error: 'Failed to update enrollment request' });
  }
});

app.delete('/enrollRequests/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await enrollCollection.deleteOne({ _id: new ObjectId(id) });
    res.send(result);
  } catch (err) {
    console.error("Failed to delete request", err);
    res.status(500).send({ error: "Failed to delete request" });
  }
});
// server/routes/enrollRoutes.js বা server.js
app.get('/checkApproval', verifyToken, async (req, res) => {
  const { userEmail, courseId } = req.query;

  const result = await enrollCollection.findOne({
    userEmail,
    courseId,
    status: 'approved',
  });

  if (result) {
    res.send({ approved: true });
  } else {
    res.send({ approved: false });
  }
});

//homepage COurses
const courseCollection = client.db('Edutech').collection('courseCollection');
// POST: Add course
app.post('/specializations', verifyToken, verifyAdmin, async (req, res) => {
  const course = req.body;
  course.createdAt = new Date();
  const result = await courseCollection.insertOne(course);
  res.send(result);
});

// GET: All Courses
app.get('/specializations', async (req, res) => {
  const result = await courseCollection.find().toArray();
  res.send(result);
});

// PATCH: Update course
app.patch('/specializations/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;
  const result = await courseCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updatedData }
  );
  res.send(result);
});

// DELETE: Delete course
app.delete('/specializations/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const result = await courseCollection.deleteOne({ _id: new ObjectId(id) });
  res.send(result);
});




// index.js or server.js
// app.use(express.static('dist'));

// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'dist', 'index.html'));
// });



  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello World!')
  })
  
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  })





console.log("DB User:", process.env.DB_user);
console.log("JWT Secret:", process.env.JWT_SECRET);


