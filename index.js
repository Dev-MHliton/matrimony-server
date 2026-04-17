const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config()
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors());
app.use(express.json());

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

        // UNIQUE INDEX (IMPORTANT)
        await favoritesCollection.createIndex(
            { biodataId: 1, email: 1 },
            { unique: true }
        );

        // ============================
        // BIODATA APIs
        // ============================

        app.get('/api/biodata', async (req, res) => {
            const result = await biodataCollection.find().toArray();
            res.send(result);
        });

        app.get('/api/biodata/search', async (req, res) => {
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

        app.get("/api/biodata/:id", async (req, res) => {
            const result = await biodataCollection.findOne({
                _id: new ObjectId(req.params.id)
            });
            res.send(result);
        });

        // ============================
        // FAVORITES APIs
        // ============================

        // Add Favorite
        app.post('/api/favorites', async (req, res) => {
            try {
                const { biodataId, email } = req.body;

                const existing = await favoritesCollection.findOne({ biodataId, email });

                if (existing) {
                    return res.send({ message: "Already added" });
                }

                const result = await favoritesCollection.insertOne({
                    biodataId,
                    email
                });

                res.send(result);

            } catch (err) {
                res.status(500).send({ error: "Error adding favorite" });
            }
        });

        //  Get Favorites
        app.get('/api/favorites', async (req, res) => {
            const { email } = req.query;

            const result = await favoritesCollection.find({ email }).toArray();
            res.send(result);
        });

        // Remove Favorite
        app.delete('/api/favorites', async (req, res) => {
            const { biodataId, email } = req.body;

            const result = await favoritesCollection.deleteOne({ biodataId, email });
            res.send(result);
        });

        console.log("MongoDB Connected");

    } catch (err) {
        console.error(err);
    }
}

run();

app.get('/', (req, res) => {
    res.send('Server Running');
});

app.listen(port, () => {
    console.log(`Server running on ${port}`);
});