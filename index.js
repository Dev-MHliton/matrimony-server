const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();

app.use(cors());
app.use(express.json());

const port = process.env.PORT || 5000;

// MongoDB URI.....................................!
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uru7rsz.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();

        const db = client.db("matrimonyDB");

        const biodataCollection = db.collection("biodata");
        const favoritesCollection = db.collection("favorites");
        const usersCollection = db.collection("users");

        console.log("MongoDB Connected...");

        // Create biodata (POST) 
        app.post("/api/biodata", async (req, res) => {
            try {
                const biodata = req.body;

                const result = await biodataCollection.insertOne(biodata);

                res.send({
                    success: true,
                    _id: result.insertedId
                });

            } catch (err) {
                res.status(500).send({ success: false, error: "Insert failed" });
            }
        });

        //Get all biodata
        app.get("/api/biodata", async (req, res) => {
            const result = await biodataCollection.find().toArray();
            res.send(result);
        });
        // Featured biodata 
        app.get("/api/biodata/featured", async (req, res) => {
            const professions = ["doctor", "engineer", "professor", "actor", "sportsman"];

            const result = await biodataCollection.find({
                profession: { $regex: professions.join("|"), $options: "i" }
            }).limit(8).toArray();

            res.send(result);
        });

        //    Search biodata 
        app.get("/api/biodata/search", async (req, res) => {
            const { age, profession, district, gender, religion } = req.query;

            let query = {};

            if (age) query.age = Number(age);
            if (profession) query.profession = { $regex: profession, $options: "i" };
            if (district) query.district = { $regex: district, $options: "i" };
            if (gender) query.gender = { $regex: gender, $options: "i" };
            if (religion) query.religion = { $regex: religion, $options: "i" };

            const result = await biodataCollection.find(query).toArray();
            res.send(result);
        });

        //   Single biodata 
        app.get("/api/biodata/:id", async (req, res) => {
            const id = req.params.id;

            if (!ObjectId.isValid(id)) {
                return res.status(400).send({ error: "Invalid ID" });
            }

            const result = await biodataCollection.findOne({
                _id: new ObjectId(id)
            });

            res.send(result || {});
        });

        //    Update biodata 
        app.put("/api/biodata/:id", async (req, res) => {
            try {
                const id = req.params.id;

                if (!ObjectId.isValid(id)) {
                    return res.send({ success: false });
                }

                const result = await biodataCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: req.body }
                );

                res.send({ success: result.modifiedCount > 0 });

            } catch {
                res.status(500).send({ success: false });
            }
        });

        // Delete biodata 
        app.delete("/api/biodata/:id", async (req, res) => {
            try {
                const id = req.params.id;

                if (!ObjectId.isValid(id)) {
                    return res.send({ success: false });
                }

                const result = await biodataCollection.deleteOne({
                    _id: new ObjectId(id)
                });

                res.send({ success: result.deletedCount > 0 });

            } catch {
                res.status(500).send({ success: false });
            }
        });

        // =========================
        // FAVORITES INDEX
        // =========================
        await favoritesCollection.createIndex(
            { biodataId: 1, email: 1 },
            { unique: true }
        );

        //    Favorite index 
        app.post("/api/favorites", async (req, res) => {
            try {
                const { biodataId, email } = req.body;

                const exists = await favoritesCollection.findOne({ biodataId, email });

                if (exists) {
                    return res.status(409).send({ message: "Already added" });
                }

                const result = await favoritesCollection.insertOne({
                    biodataId: biodataId.toString(),
                    email
                });

                res.send(result);

            } catch {
                res.status(500).send({ error: "Failed to add favorite" });
            }
        });

        // Get Favorites 
        app.get("/api/favorites", async (req, res) => {
            try {
                const { email } = req.query;

                const result = await favoritesCollection.aggregate([
                    { $match: { email } },
                    {
                        $addFields: {
                            biodataObjectId: { $toObjectId: "$biodataId" }
                        }
                    },
                    {
                        $lookup: {
                            from: "biodata",
                            localField: "biodataObjectId",
                            foreignField: "_id",
                            as: "biodata"
                        }
                    },
                    { $unwind: "$biodata" }
                ]).toArray();

                res.send(result);

            } catch {
                res.status(500).send({ error: "Error fetching favorites" });
            }
        });

        // Delete Favorites 
        app.delete("/api/favorites", async (req, res) => {
            const { biodataId, email } = req.body;

            const result = await favoritesCollection.deleteOne({
                biodataId,
                email
            });

            res.send(result);
        });

        //    User Get 
        app.get("/api/user", async (req, res) => {
            const { email } = req.query;

            const user = await usersCollection.findOne({ email });

            res.send(user || {});
        });

        //   User Update 
        app.put("/api/user", async (req, res) => {
            const { email, ...data } = req.body;

            const result = await usersCollection.updateOne(
                { email },
                { $set: { email, ...data } },
                { upsert: true }
            );

            res.send(result);
        });

    } catch (err) {
        console.error("Mongo Error:", err);
    }
}
run();

app.get("/", (req, res) => {
    res.send("Matrimony Server Running");
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});