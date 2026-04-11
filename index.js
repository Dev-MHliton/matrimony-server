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

        const database = client.db("matrimonyDB");
        const biodataCollection = database.collection("biodata");

        // Create Biodata
        app.post('/api/biodata', async (req, res) => {
            const data = req.body;
            const result = await biodataCollection.insertOne(data);
            res.send(result);
        });

        // Get ALL Biodata
        app.get('/api/biodata', async (req, res) => {
            const result = await biodataCollection.find().toArray();
            res.send(result);
        });

        // Featured Premium APi
        app.get('/api/biodata/featured', async (req, res) => {
            const specialProfessions = ["doctor", "professor", "engineer", "actor", "sportsman"];
            const result = await biodataCollection.aggregate([
                {
                    $addFields: {
                        priority: {
                            $cond: [
                                { $in: [{ $toLower: "$profession" }, specialProfessions] },
                                1,
                                2
                            ]
                        }
                    }
                },
                { $sort: { priority: 1 } },
                { $limit: 4 }
            ]).toArray();
            res.send(result);
        });

        // Search API (updated)
        app.get('/api/biodata/search', async (req, res) => {
            const { age, profession, district, gender, religion } = req.query;

            let query = {};
            if (age) query.age = Number(age);
            if (profession) query.profession = { $regex: profession, $options: "i" };
            if (district) query.district = { $regex: district, $options: "i" };
            if (gender) query.gender = { $regex: gender, $options: "i" };
            if (religion) query.religion = { $regex: religion, $options: "i" };
            try {
                const result = await biodataCollection.find(query).toArray();
                res.send(result);
            } catch (err) {
                res.status(500).send({ error: "Search failed", details: err.message });
            }
        });

        // Single biodata
        app.get("/api/biodata/:id", async (req, res) => {
            const { id } = req.params;
            const result = await biodataCollection.findOne({ _id: new ObjectId(id) });
            res.send(result);
        });

        console.log("MongoDB Connected.");

    } catch (err) {
        console.error("MongoDB ERROR:", err);
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Matrimony API Running')
})

app.listen(port, () => {
    console.log(`Matrimony is running on port: ${port}`);
});