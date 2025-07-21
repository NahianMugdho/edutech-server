require("dotenv").config();

const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb"); // For _id usage in PATCH

const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json()); // This enables JSON parsing

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_pass}@cluster0.qvjt0ww.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// ✅ JWT Verify Middleware
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) return res.status(401).send({ error: "No token provided" });

  const token = authHeader.split(" ")[1]; // "Bearer token"
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).send({ error: "Unauthorized" });
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    //products

    const userCollection = client.db("Edutech").collection("users");
    // ✅ Create JWT token route
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const payload = {
        email: user.email,

        role: user.role || "student",
      };
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    //user
    app.get("/users", async (req, res) => {
      try {
        const users = await userCollection.find().toArray();
        res.send(users);
      } catch (error) {
        res.status(500).send({ message: "Error fetching users" });
      }
    });

    app.post("/users", async (req, res) => {
      const { name, email, photo } = req.body;
      const existingUser = await userCollection.findOne({ email });

      if (existingUser) {
        return res.send({ message: "User already exists", insertedId: null });
      }

      const result = await userCollection.insertOne({
        name,
        email,
        photo,
        role: "student", // ✅ Everyone starts as student/general
      });

      res.send(result);
    });

    // Check if user is admin
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user?.role === "admin";
      res.send({ admin: isAdmin });
    });

    const verifyAdmin = async (req, res, next) => {
      const email = req.user?.email;

      const user = await userCollection.findOne({ email: email });

      if (user?.role !== "admin") {
        return res.status(403).send({ error: "Forbidden: Admins only" });
      }

      next();
    };

    //kaium
    // ✅ GET: Check if user is a teacher
    app.get("/users/teacher/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email });
      const isTeacher = user?.role === "teacher";
      res.send({ teacher: isTeacher });
    });

    // ✅ PATCH: Update user role (e.g. from student to admin/teacher)
    app.patch("/users/role/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const { role } = req.body;

      if (!["admin", "teacher", "student"].includes(role)) {
        return res.status(400).send({ error: "Invalid role" });
      }

      const result = await userCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { role: role } }
      );

      res.send(result);
    });

    // ✅ DELETE: Remove a user (admin only)
    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      try {
        const result = await userCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (error) {
        console.error("Failed to delete user:", error);
        res.status(500).send({ error: "Failed to delete user" });
      }
    });

    //kaium

    //for updateProfilePicture.jsx from FE
    app.patch("/users/:email", async (req, res) => {
      const email = req.params.email;
      const { photo } = req.body;

      const result = await userCollection.updateOne(
        { email },
        { $set: { photo } }
      );

      res.send(result);
    });

    // Inside your run() function in backend
    const videoCollection = client.db("Edutech").collection("videos");

    // ✅ Route: Add new course with videos (Admin only)
    app.post("/videos", verifyToken, verifyAdmin, async (req, res) => {
      const course = req.body;
      try {
        const result = await videoCollection.insertOne(course);
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: "Failed to insert course" });
      }
    });

    // ✅ PATCH: Approve a course
    app.patch(
      "/videos/approve/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        try {
          const result = await videoCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { status: "approved" } }
          );
          res.send(result);
        } catch (error) {
          res.status(500).send({ error: "Failed to approve course" });
        }
      }
    );

    app.get("/videos", async (req, res) => {
      try {
        const videos = await videoCollection.find().toArray();
        res.send(videos);
      } catch (error) {
        res.status(500).send({ message: "Error fetching videos" });
      }
    });

    //kaium
    // ✅ DELETE: Remove a course from DB
    app.delete("/videos/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      try {
        const result = await videoCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to delete course" });
      }
    });

    // ✅ Get single course by ID (with validation)
    app.get("/videos/:id", async (req, res) => {
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

    app.patch("/videos/:id", verifyToken, verifyAdmin, async (req, res) => {
      const { id } = req.params;
      const updatedData = req.body;

      try {
        const result = await videoCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedData }
        );
        res.send(result);
      } catch (err) {
        console.error("Error updating course:", err);
        res.status(500).send({ error: "Failed to update course" });
      }
    });

    // ✅ PATCH: Toggle featured status (max 6 featured allowed)
    app.patch(
      "/videos/feature/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const { id } = req.params;
        const { featured } = req.body;

        try {
          const targetCourse = await videoCollection.findOne({
            _id: new ObjectId(id),
          });

          if (!targetCourse) {
            return res.status(404).send({ error: "Course not found" });
          }

          // ✅ If setting to true → limit max 6 featured courses
          if (featured) {
            const featuredCount = await videoCollection.countDocuments({
              featured: true,
            });
            if (featuredCount >= 6) {
              return res
                .status(400)
                .send({ error: "You can only feature up to 6 courses" });
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
      }
    );

    //kaium

    const enrollCollection = client.db("Edutech").collection("enrollRequests");
    // ✅ POST: Enroll in a course
    // POST: User Enrollment Request
    app.post("/enrollRequests", verifyToken, async (req, res) => {
      const enrollment = req.body;

      try {
        // Check if user already requested this course
        const existing = await enrollCollection.findOne({
          userEmail: enrollment.userEmail,
          courseId: enrollment.courseId,
        });

        if (existing) {
          return res
            .status(400)
            .send({ error: "Already requested this course" });
        }

        enrollment.status = "pending"; // Initial status
        enrollment.timestamp = new Date();

        const result = await enrollCollection.insertOne(enrollment);
        res.send(result);
      } catch (err) {
        console.error("Enroll error:", err);
        res.status(500).send({ error: "Failed to submit enrollment request" });
      }
    });

    // GET: Fetch all enroll requests
    app.get("/enrollRequests", verifyToken, async (req, res) => {
      try {
        const requests = await enrollCollection.find().toArray();
        res.send(requests);
      } catch (err) {
        console.error("Failed to get enrollment requests", err);
        res.status(500).send({ error: "Failed to get enrollment requests" });
      }
    });
    // ✅ PATCH: Approve enrollment request
    app.patch(
      "/enrollRequests/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const { id } = req.params;
        const { status } = req.body;

        try {
          const result = await enrollCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { status: status || "approved" } }
          );
          res.send(result);
        } catch (err) {
          console.error("Failed to update enrollment request", err);
          res
            .status(500)
            .send({ error: "Failed to update enrollment request" });
        }
      }
    );
    app.delete(
      "/enrollRequests/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const { id } = req.params;

        try {
          const result = await enrollCollection.deleteOne({
            _id: new ObjectId(id),
          });
          res.send(result);
        } catch (err) {
          console.error("Failed to delete request", err);
          res.status(500).send({ error: "Failed to delete request" });
        }
      }
    );
    // server/routes/enrollRoutes.js বা server.js
    app.get("/checkApproval", verifyToken, async (req, res) => {
      const { userEmail, courseId } = req.query;

      const result = await enrollCollection.findOne({
        userEmail,
        courseId,
        status: "approved",
      });

      if (result) {
        res.send({ approved: true });
      } else {
        res.send({ approved: false });
      }
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

console.log("DB User:", process.env.DB_user);
console.log("JWT Secret:", process.env.JWT_SECRET);
