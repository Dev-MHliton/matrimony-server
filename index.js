const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

app.use(cors());
app.use(express.json());

const port = process.env.PORT || 5000;

// MongoDB CONNECTION
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

        //Favorites unique index 
        await favoritesCollection.createIndex(
            { biodataId: 1, email: 1 },
            { unique: true }
        );


        // Get all biodata
        app.get("/api/biodata", async (req, res) => {
            const result = await biodataCollection.find().toArray();
            res.send(result);
        });

        // Featured api
        app.get("/api/biodata/featured", async (req, res) => {
            const professions = ["doctor", "engineer", "professor", "actor", "sportsman"];

            const result = await biodataCollection.find({
                profession: { $regex: professions.join("|"), $options: "i" }
            }).limit(8).toArray();

            res.send(result);
        });

        // Search biodata
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

        // Single biodata
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

        //Add favorite
        app.post("/api/favorites", async (req, res) => {
            try {
                const { biodataId, email } = req.body;

                const exists = await favoritesCollection.findOne({
                    biodataId,
                    email
                });

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

        // Get favorite
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

        // Delete Favorite
        app.delete("/api/favorites", async (req, res) => {
            const { biodataId, email } = req.body;

            const result = await favoritesCollection.deleteOne({
                biodataId,
                email
            });

            res.send(result);
        });

        //Get user
        app.get("/api/user", async (req, res) => {
            const { email } = req.query;

            const user = await usersCollection.findOne({ email });

            res.send(user || {});
        });

        // Update user 
        app.put("/api/user", async (req, res) => {
            const {
                email,
                name,
                phone,
                age,
                gender,
                religion,
                country,
                district,
                about
            } = req.body;

            const result = await usersCollection.updateOne(
                { email },
                {
                    $set: {
                        email,
                        name,
                        phone,
                        age,
                        gender,
                        religion,
                        country,
                        district,
                        about
                    }
                },
                { upsert: true }
            );

            res.send(result);
        });

        console.log("🚀 MongoDB Connected Successfully");

    } catch (err) {
        console.error("Server Error:", err);
    }
}

run();


app.get("/", (req, res) => {
    res.send("Matrimony Server Running 🚀");
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});