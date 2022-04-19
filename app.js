const { Console } = require('console');
const { create } = require('domain');
const { CLIENT_RENEG_WINDOW } = require('tls');
const express = require('express'),
    bodyParser = require('body-parser'),
    cors = require('cors'),
    path = require('path'),
    sendGrid = require('sendgrid'),
    sgMail = require('@sendgrid/mail'),
    auth = require("./middleware/auth"),
    jwt = require("jsonwebtoken"),
    cloudinary = require('cloudinary').v2,
  { ObjectId, CURSOR_FLAGS } = require('mongodb');

const bcrypt = require('bcryptjs'),
    saltRounds = 10;

const PORT = process.env.PORT || 5000;

const emailPlatform = {
    "mobile": `<html>
              <div style="margin-top:50px;text-align: center; font-family: Arial;" container>
                <h1> Welcome! </h1>
                <p style="margin-bottom:30px;"> Here's your verification code!</p>
                <a clicktracking="off" href="verifyLink" style="background:blue;color:white;padding:10px;margin:200px;border-radius:5px;text-decoration:none;">usercode</a>
              </div>
            </html>`,
    "web": `<html>
            <div style="margin-top:50px;text-align: center; font-family: Arial;" container>
              <h1> Welcome! </h1>
              <p style="margin-bottom:30px;"> Verify your account by clicking the following link:</p>
              <a clicktracking="off" href="verifyLink" style="background:blue;color:white;padding:10px;margin:200px;border-radius:5px;text-decoration:none;">VERIFY</a>
            </div>
            <div style="margin-top:50px;text-align: center; font-family: Arial; font-size: 13px">
              <p> Alternatively, paste this link into your browser.  </p>
              <a>verifyLink</a>
            </div>
          </html>`
};

const successPage = `<html>
                     <p style="background-color:red;">Some text</p>
                     </html>`;

const senderEmail = process.env.SENDER_EMAIL;
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Setting up Express and cors.
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Cloudinary set up 
cloudinary.config({
    cloud_name: "deks041ua",
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Get port
app.set('port', (process.env.PORT || 5000));

// Base URL
// TODO: make this get heroku or localhost based on prod/local
const baseURL = "http://localhost:5000";

// Connecting to the MongoDB database
const MongoClient = require('mongodb').MongoClient;

const client = new MongoClient(process.env.MONGODB_URI);
client.connect();

// Collection names
const userCol = "users",
    recipeCol = "recipes",
    countryCol = "countries";

// We send empty errors a lot.
let emptyErr = { error: "" };

function hash(str)
{
    return bcrypt.hashSync(str, bcrypt.genSaltSync(saltRounds));
}

app.use((req, res, next) =>
{
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PATCH, DELETE, OPTIONS'
    );
    next();
});




// USER LOGIN
app.post('/api/login', async (req, res) =>
{
    // Input = username, password
    const { username, password } = req.body;

    // Connecting to Mongo and searching the Users collection for the given input.
    const db = client.db();
    const user = await db.collection(userCol).findOne( { username: username } );

    // User not found
    if (!user)
        return res.status(500).json( { error: 'User not found.' } );

    // Compare password
    if (!bcrypt.compareSync(password, user.password))
        return res.status(500).json( { error: 'Username or password incorrect.' } );

    // Refresh token
    const token = jwt.sign(
        { userid: user._id, username },
        process.env.TOKEN_KEY,
         {
            expiresIn: "2h",
        }
    );

    user.token = token;

    // Remove password from json before sending back
    delete user.password;

    res.status(200).json(user);
});

// USER REGISTER
app.post('/api/register/:platform', async (req, res) =>
{
    const { username, password, email } = req.body;
    const db = client.db();
    let userCode = createAuthCode();
    let platform = req.params.platform;

    const usernameTaken = await db.collection(userCol).findOne( { username: username } );

    // If there's a result the username is taken.
    if (usernameTaken != null)
        return res.status(500).json( { error: "Username taken." } );

    let verifyLink = "hostingLink/api/verify/usercode/username".replace("hostingLink", baseURL).replace("usercode", userCode).replace("username", username);

    // Set up web email content
    let htmlToSend = emailPlatform["web"].replaceAll("verifyLink", verifyLink);

    // Set up mobile email content
    if (platform === "mobile")
        htmlToSend = emailPlatform["mobile"].replaceAll("verifyLink", verifyLink).replaceAll("usercode", userCode);

    // Construct email
    const msg = {
        to: email,
        from: senderEmail,
        subject: 'Verify Your Account',
        text: ' ',   // THIS CANNOT BE THE EMPTY STRING. But it can be a space.
        html: htmlToSend
    };

    // Send auth code to given email
    sgMail.send(msg).catch((error) => { console.error(error); });

    // Add user to users collection
    let newUser = {
        username: username,
        password: hash(password),
        email: email,
        profilePic: "",
        favorites: [],
        created: [],
        likes: [],
        verified: "no",
        auth: userCode
    };

    // Add token to user
    const token = jwt.sign(
        { userid: newUser._id, username },
        process.env.TOKEN_KEY,
        {
            expiresIn: "2h",
        }
    );

    newUser.token = token;

    db.collection(userCol).insertOne(newUser);
    res.json(emptyErr);
});

// USER VERIFY
app.get('/api/verify/:auth/:username', async (req, res) =>
{
    // Check the database for a username that has a matching code.
    let [code, username] = [req.params.auth, req.params.username];

    // The code is stored as integer in the collection
    code = parseInt(code);

    const db = client.db();

    // Check collection for a document with username and auth matching
    const found = await db.collection(userCol)
                          .countDocuments( { username: username, auth: code },
                                           { limit: 1 } );

    // If document found redirect user to landing page and mark the document as verified
    if (found)
        db.collection(userCol).updateOne( { username: username, auth: code },
                                          { $set: { verified: "yes" } } );
    else
        res.status(500).json( { error: "ID/User information invalid." } );

    res.send(successPage);
});



// Password Reset Section
app.post('/api/getResetCode', auth, async (req, res) =>
{
    const { userID, email } = req.body;
    const db = client.db();

    // Check that email is valid
    const valid = await db.collection(userCol).findOne( { _id: ObjectId(userID), email: email } );

    if (!valid) 
        return res.status(500).json( { error: "Invalid email address." } );

    const authCode = createAuthCode();

    // Set this code to the code in the database
    db.collection(userCol).updateOne( {email: email},
                                      { $set: { auth: authCode } } );

    // Construct email
    const htmlToSend = `<html>
                            <div style="margin-top:50px;text-align: center; font-family: Arial;" container>
                                <h1> Hello! </h1>
                                <p style="margin-bottom:30px;"> Reset your password by entering this code:</p>
                                <p style="background:blue;color:white;padding:10px;margin:200px;border-radius:5px;text-decoration:none;">CODE</p>
                            </div>
                        </html>`.replace("CODE", String(authCode));

    const msg = {
        to: email,
        from: senderEmail,
        subject: 'Password Reset Request',
        text: ' ',
        html: htmlToSend
    };

    // Send email
    sgMail.send(msg).catch((error) => { console.error(error); });

    res.json( emptyErr );
});

app.post('/api/validateResetCode', async (req, res) =>
{
    const { userID, givenCode } = req.body;
    const db = client.db();

    // Get user
    const user = await db.collection(userCol).findOne( { _id: ObjectId(userID) } );

    // Not found
    if (!user) 
        return res.status(500).json( { error: "Invalid User ID" } );
    
    // Compare given code to one in db
    if (String(user.auth) != String(givenCode))
        return res.status(500).json( { error: "Code does not match." } );
    
    res.json( emptyErr );
});

app.post('/api/editUser', auth, async (req, res) =>
{
    let { userID, newField, newValue } = req.body;
    const db = client.db();

    // Find the user
    const user = await db.collection(userCol).findOne( { _id: ObjectId(userID) } );
    
    // Not found
    if (!user) 
        return res.status(500).json( { error: "Invalid User ID" } );

    // Valid field?
    if (!(["username", "password", "email", "profilePic"].includes(newField)))
        return res.status(500).json( { error: "Invalid field." } );

    // Check if field is password
    if (newField === "password")
        newValue = hash(newValue);
    
    // Update the value
    await db.collection(userCol).updateOne( { _id: ObjectId(userID) },
                                            { $set: { [newField]: newValue } });

    // We okay
    res.json( emptyErr );
});



// GET USER FAVORITE(S)
app.post('/api/getFavorites', auth, async (req, res) =>
{
    const { userID } = req.body;
    const db = client.db();

    // Get documents that match UserID
    const c = db.collection(userCol).find( { _id: ObjectId(userID) } );

    // If db query results in empty cursor throw error
    if (!await c.hasNext())
        return res.status(500).json( { error: "Invalid UserID" } );

    // Get users favorites and return
    const user = await c.next();
    const favs = user.favorites;

    // Iterate backwards so removing elements doesn't mess with indexing
    for (let i = favs.length; i >= 0; i--)
    {
        // If the recipe isn't in the database
        if (await atLeastOne(recipeCol, favs[i]) == 0)
        {
            // Remove recipe from user favorites list from database.
            db.collection(userCol).updateOne(
                  { _id: ObjectId(userID) },
                  { $pull: { favorites: ObjectId(favs[i]) } }
            )
            // Remove recipe from favs
            favs.splice(i, 1);
        }
    }

    let result = await Promise.all(
                    favs.map(  
                        async x => await db.collection(recipeCol).findOne( { _id: x } )
                        )
                    );

    res.json(result);
});

// ADD USER FAVORITE
app.post('/api/addFavorite', auth, async (req, res) =>
{
    // Input  = User ID, Recipe ID
    const { userID, recipeID } = req.body;
    const db = client.db();

    // Check that user and recipe exists
    const userExists = await atLeastOne(userCol, userID);
    const recipeExists = await atLeastOne(recipeCol, recipeID);

    // If either user or recipe doesn't exist return error
    if (!userExists || !recipeExists)
    {
        let errors = [];

        if (!userExists) errors.push("userID");
        if (!recipeExists) errors.push("recipeID");
        let err = "Invalid " + errors.join(', ');

        return res.status(500).json( { error: err } );
    }

    // Add recipe to favorites array of user
    db.collection(userCol).updateOne(
        { _id: ObjectId(userID) },
        { $push: { favorites: ObjectId(recipeID) } }
    );

    // Update favorite count for recipe
    db.collection(recipeCol).updateOne(
        { _id: ObjectId(recipeID) },
        { $inc: { favorites: 1 } }
    );

    // Okay status
    res.json( emptyErr );
});

// DELETE USER FAVORITE
app.post('/api/deleteFavorite/', auth, async (req, res, next) =>
{
    const { userID, recipeID } = req.body;
    const db = client.db();

    // Check that user and recipe exists
    const userExists = await atLeastOne(userCol, userID);
    const recipeExists = await atLeastOne(recipeCol, recipeID);

    // If either user or recipe doesn't exist return error
    if (!userExists || !recipeExists)
    {
        let errors = [];

        if (!userExists) errors.push("userID");
        if (!recipeExists) errors.push("recipeID");
        let err = "Invalid " + errors.join(', ');

        return res.status(500).json( { error: err } );
    }

    // Remove recipe from favorites array of user
    db.collection(userCol).updateOne(
        { _id: ObjectId(userID) },
        { $pull: { favorites: ObjectId(recipeID) } }
    );

    // Update favorite count for recipe
    db.collection(recipeCol).updateOne(
        { _id: ObjectId(recipeID) },
        { $inc: { numFavorites: -1 } }
    );

    // Okay status
    res.json( emptyErr );
});



// CREATE RECIPE
app.post('/api/createRecipe', auth, async (req, res) =>
{
    const { name, desc, pic, creator,
            instructions, ingredients,
            country, coordinates } = req.body;

    const db = client.db();

    var recipe = {
        name: name,
        desc: desc,
        pic: null,
        creator: ObjectId(creator),
        instructions: instructions,
        ingredients: ingredients,
        country: country,
        location: {
            type: "Point",
            coordinates: coordinates.reverse()
        },
        likes: 0,
        favorites: 0
    };

    if (pic != "")
    {
        // Upload the image to Cloudinary
        try
        {
            recipe.pic = (await cloudinary.uploader.upload(pic)).secure_url;
        }
        catch (e)
        {
            res.status(500).json( { error: "Image upload failure." } );
        }
    }

    // Check if the country is in the database
    let countryExists = await db.collection(countryCol)
                                .countDocuments( { name: country },
                                                 { limit: 1 });

    // Put country in database if it doesn't exist
    if (!countryExists)
        await db.collection(countryCol).insertOne( { name: country, recipes: [] } );

    // Add recipe to database and get the _id
    let recipeID = await db.collection(recipeCol).insertOne(recipe);
    recipeID = recipeID.insertedId;

    // Add recipe to country.recipes
    db.collection(countryCol).updateOne(
        { name: country },
        { $push: { recipes: recipeID } }
    );

    // Add recipe to user.created
    db.collection(userCol).updateOne(
        { _id: ObjectId(creator) },
        { $push: { created: recipeID } }
    );

    res.json( { recipeID: recipeID } );
});

// UPDATE RECIPE
app.post('/api/editRecipe', auth, async (req, res) =>
{
    // Input = name, description, picture link, text, and Recipe ID (string).
    const { recipeID, newField, newValue } = req.body;
    const db = client.db();

    // Valid field?
    if (!(["name", "desc", "pic", "instructions", "ingredients"].includes(newField)))
        return res.status(500).json( { error: "Invalid field." } );

    // Update recipe with new information.
    await db.collection(recipeCol).updateOne( { _id: ObjectId(recipeID) },
                                            { $set: { [newField]: newValue } });

    // Okay status
    res.json( emptyErr );
});

// VIEW RECIPE
app.post('/api/viewRecipe', auth, async (req, res) =>
{
    const id = req.body.id;
    const db = client.db();

    // If the recipe doesn't exist return bad status
    if (!(await atLeastOne(recipeCol, id)))
        return res.status(404).json( { error: "Recipe not found" } )

    // Find the document and return
    let recipeDoc = await db.collection(recipeCol).findOne( { _id: ObjectId(id) } );
    res.json(recipeDoc);
});

// DELETE RECIPE
app.post('/api/deleteRecipe', auth, async (req, res) =>
{
    // Input = recipeID
    const { recipeID } = req.body;
    const db = client.db();

    // Find the recipe from the recipes collection
    const recipe = await db.collection(recipeCol).findOne( { _id: ObjectId(recipeID) } );
    const country = recipe.country;

    // Delete recipe from recipes collection.
    db.collection(recipeCol).deleteOne( { _id: ObjectId(recipeID) } );

    // Removing recipe from the country's list of recipes.
    db.collection(countryCol).updateOne(
        { name: country },
        { $pull: { recipes: ObjectId(recipeID) } }
    );

    // Okay status
    res.json( emptyErr );
});



// GET RANDOM RECIPE
app.post('/api/randomRecipe', auth, async (req, res) =>
{
    const db = client.db();

    let randomRecipe = db.collection(recipeCol).aggregate(
        [ { $sample: { size: 1 } } ]
    ).toArray();

    res.json(await randomRecipe);
})

// GET USER LIKE(S)
app.post('/api/getLikes', auth, async (req, res) =>
{
    const { userID } = req.body;
    const db = client.db();

    // Get documents that match UserID
    const c = db.collection(userCol).find( { _id: ObjectId(userID) } );

    // If db query results in empty cursor throw error
    if (!await c.hasNext())
        return res.status(500).json( { error: "Invalid UserID" } );

    // Get users favorites and return
    const user = await c.next();
    const likes = user.likes;

    // Iterate backwards so removing elements doesn't mess with indexing
    for (let i = likes.length; i >= 0; i--)
    {
        // If the recipe isn't in the database
        if (await atLeastOne(recipeCol, likes[i]) == 0)
        {
            // Remove recipe from user likes list from database.
            db.collection(userCol).updateOne(
                  { _id: ObjectId(userID) },
                  { $pull: { likes: ObjectId(likes[i]) } }
            )
            // Remove recipe from likes
            likes.splice(i, 1);
        }
    }

    let result = await Promise.all(
                    likes.map(  
                        async x => await db.collection(recipeCol).findOne( { _id: x } )
                        )
                    );

    res.json(result);
});

// ADD USER LIKE
app.post('/api/addLike/', auth, async (req, res, next) =>
{
    const { userID, recipeID } = req.body;
    const db = client.db();

    // Check that user and recipe exists
    const userExists = await atLeastOne(userCol, userID);
    const recipeExists = await atLeastOne(recipeCol, recipeID);

    // If either user or recipe doesn't exist return error
    if (!userExists || !recipeExists)
    {
        let errors = [];

        if (!userExists) errors.push("userID");
        if (!recipeExists) errors.push("recipeID");
        let err = "Invalid " + errors.join(', ');

        return res.status(500).json( { error: err } );
    }

    // Update like count for recipe
    db.collection(recipeCol).updateOne(
        { _id: ObjectId(recipeID) },
        { $inc: { likes: 1 } }
    );

    // Add recipe to likes array of user
    db.collection(userCol).updateOne(
        { _id: ObjectId(userID) },
        { $push: { likes: ObjectId(recipeID) } }
    );

    // Okay status
    res.json( emptyErr );
});

// DELETE USER LIKE
app.post('/api/deleteLike/', auth, async (req, res, next) =>
{
    const { userID, recipeID } = req.body;
    const db = client.db();

    // Check that user and recipe exists
    const userExists = await atLeastOne(userCol, userID);
    const recipeExists = await atLeastOne(recipeCol, recipeID);

    // If either user or recipe doesn't exist return error
    if (!userExists || !recipeExists)
    {
        let errors = [];

        if (!userExists) errors.push("userID");
        if (!recipeExists) errors.push("recipeID");
        let err = "Invalid " + errors.join(', ');

        return res.status(500).json( { error: err } );
    }

    // Update like count for recipe
    db.collection(recipeCol).updateOne(
        { _id: ObjectId(recipeID) },
        { $inc: { likes: -1 } }
    );

    // Remove recipe from likes array of user
    db.collection(userCol).updateOne(
        { _id: ObjectId(userID) },
        { $pull: { likes: ObjectId(recipeID) } }
    );

    // Okay status
    res.json( emptyErr );
});

app.post('/api/getLikedFavorited', auth, async (req, res) =>
{
    const { userID, recipeID } = req.body;
    const db = client.db();

    let result = {};

    const user = await db.collection(userCol).findOne( { _id: ObjectId(userID) } );

    if (!user) 
        res.status(404).json( { error: "User not found" } );

    result.liked = user.likes.some(f => { return f.equals(recipeID) });
    result.favorited = user.favorites.some(f => { return f.equals(recipeID) });

    res.json(result);
})


// GET RECIPES BY COUNTRY
app.post('/api/getCountryRecipes', auth, async (req, res) =>
{
    const { country } = req.body;
    const db = client.db();

    // Query the db and store in an array
    const found = await db.collection(countryCol).findOne( { name: country } );

    if (!found)
        res.status(404).json( { error: "Country not found" } );
    
    // Get the actual recipe object associated with each id
    let result = await Promise.all(
                    found.recipes.map(  
                        async x => await db.collection(recipeCol).findOne( { _id: x } )
                        )
                    );

    res.json(result);
});

// GET RECIPES BY USER
app.post('/api/getUserRecipes', auth, async (req, res) =>
{
    const { userID } = req.body;
    const db = client.db();

    // Get user
    const user = await db.collection(userCol).findOne( { _id: ObjectId(userID) } );

    if (!user)
        return res.status(500).json( { error: "Invalid User ID" } );

    // Grab the recipe associated with each id
    let result = await Promise.all(
                    user.created.map(
                        async x => await db.collection(recipeCol).findOne( { _id: x } )
                    )
                );

    // Return created recipes
    res.json(result);
});

// GET RECIPES BY SEARCH
app.post('/api/searchRecipe', auth, async (req, res) =>
{
    let searchTerm = req.body.searchTerm;
    const db = client.db();

    // Regex to allow matches where the term is a substring of any result
    let term = ".*" + searchTerm + ".*";
    // "i" for insensitive search
    const recipesCursor = await db.collection(recipeCol).find( { name:
        { $regex: term, $options: "i" }
    } );

    const ret = await recipesCursor.toArray();

    res.json(ret);
});

// GET NEARBY RECIPES
app.post('/api/getNearbyRecipes', auth, async (req, res) => 
{   
    // Location given [x, y] = lat, long
    // Distance given in miles, float number
    const { location, distance } = req.body;
    const db = client.db();

    // Convert distance in miles to km
    let d = parseInt(distance) * 1609;

    // Get recipes and filter out those that are too far
    let recipes = await db.collection(recipeCol).find(
        {
            location: {
                $nearSphere: {
                    $geometry: {
                        type: "Point",
                        coordinates: location.reverse()
                    },
                    $maxDistance: d
                }
            }
        }).toArray();

    res.json(recipes);
});

function haversine(a, b)
{
    const [lat1, lon1] = a,
          [lat2, lon2] = b

    const rads = x => x * Math.PI / 180;

    const phi_1 = rads(lat1),
          phi_2 = rads(lat2),
          dphi = rads(lat2 - lat1),
          dlambda = rads(lon2 - lon1);

    const t = Math.sin(dphi / 2) * Math.sin(dphi/2) + 
              Math.cos(phi_1) * Math.cos(phi_2) *
              Math.sin(dlambda / 2) * Math.sin(dlambda / 2);

    // The secret is 6371e3. Don't look it up.
    return 6371e3 * 2 * Math.atan2(Math.sqrt(t), Math.sqrt(1 - t)) / 1000;
}

// Used when generating the code a user needs to enter to verify their account.
// Returns a 5-digit code as an int
function createAuthCode() {
    return Math.floor(Math.random() * (99999 - 11111) + 11111);
}

async function atLeastOne(col, id)
{
    const db = client.db();

    // 0 or 1 depending on if at least one document exists with the given id.
    const exists = await db.collection(col)
                           .countDocuments( { _id: ObjectId(id) },
                                            { limit: 1 } );
    return (exists == 1);
}

module.exports = app;