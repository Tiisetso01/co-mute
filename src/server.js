const express = require('express');
const cors = require('cors');
const app = express();
const route = express.Router();
const mongoose = require('mongoose');
const bodyParser = require("body-parser");
const path = require('path');
const dotenv = require('dotenv').config();

// Basic Configuration
const port = process.env.PORT || 3000;

//middlewares
app.use(cors());
app.use(express.static(__dirname + '/public'));
app.use('/images', express.static('images'));
//app.use('/scripts', express.static('/scripts'));
app.use('*/scripts',express.static('public/scripts'));
app.use(bodyParser.urlencoded({ extended: true }));

// set up view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');
app.engine('html', require('ejs').renderFile);


// connecting to the Database (MONGODB)
const mySecret = process.env['MONGO_URI']
mongoose.connect(mySecret, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => { console.log("connected") }).catch((e) => { console.log("error") })


// defining Schemas
let userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  surname: { type: String, required: true },
  phone: { type: String },
  email: { type: String, required: true },
  password: { type: String, required: true },
})

let registerSchema = new mongoose.Schema({
  userid: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  departure_time: { type: Date, required: true },
  arrival_time: { type: Date, required: true },
  origin: { type: String, required: true },
  days_available: { type: Number },
  destination: { type: String, required: true },
  available_seats: { type: Number, required: true },
  Owner: { type: String, required: true },
  notes: { type: String },

})
let passengerSchema = new mongoose.Schema({
  passengerUserid: { type: String, required: true },
  carid: { type: String, required: true },
  joinedAt: { type: Date, default: Date.now },
  ownerInfo: { type: Array, "default": [] },
})


// declaring schemas models 
const User = mongoose.model("User", userSchema)
const register = mongoose.model("register", registerSchema);
const passenger = mongoose.model("passenger", passengerSchema);

// ***ROUTES STARTS HERE**\\

//LOGIN ENDPOINT
app.route('/')
  .get((req, res) => {
    res.render(process.cwd() + '/views/index.html', { errMessage: "" });
  })
  .post((req, res) => {

    User.findOne({email: req.body.email, password: req.body.password})
        .exec((err, data) => {

         // if the user is found redirect to home page
          if (!err && data != null) {
            res.redirect('/home/' + data._id);
    
          } else {
            //else send err message
            res.render(process.cwd() + '/views/index.html', { errMessage: "Wrong password or email" })
          }
        })
  })

// SIGNUP ENDPOINT
app.route('/signup')
  .get((req, res) => {
    res.render(process.cwd() + '/views/signup.html', { message: "" });
  })
  .post((req, res) => {

    let { name, surname, phone, email, password, password2 } = req.body;
    let newUser = new User({
      name: name,
      surname: surname,
      phone: phone,
      email: email,
      password: password
    })
    // if the passwords don't match send error message
    if (password != password2) {
      res.render(process.cwd() + '/views/signup.html', { message: "*The two passwords don't match" })
    } else {
      //Else save the user data if no error
      newUser.save((err, signUpData) => {
        if (!err) {
          res.redirect('/');
        }
      })
    }

  })


//* *HOME PAGE ENDPOINT **\\
app.route('/home/:userid')
  .get((req, res) => {
    let userid = req.params.userid;
    let myCarPool = [];  // store car pool opportunities user joined
    passenger.find({ passengerUserid: userid })
             .sort({joinedAt:-1})
             .exec((err, passengerResult) => {
                // finding car opportunities user joined
                if (passengerResult.length > 0) {
                    // add car opportunities joined inside array
                    //and the date they joined them
                    passengerResult.map((ride) => {
                      ride.ownerInfo[0].joinedAt = ride.joinedAt;
                      myCarPool.push(ride.ownerInfo[0])
                    })
                }
               // finding the user to get their name and surname
               // the displaying them on the home page, along with the cars they joined
                User.findOne({ _id: userid })
                .exec((err, userData) => {
                  res.render(process.cwd() + '/views/home.html', { myCarPool: myCarPool, userid: userid, name: userData.name, surname: userData.surname });
                })
          
              })

  })
  .post((req, res) => {

    let userid = req.params.userid
    // user leaving the car pool oppunity they joined 
    //if they press the leave button on the home page
    passenger.findOneAndDelete({ passengerUserid: userid, carid: req.query.carid }).exec((err, data) => { res.redirect("/home/" + userid) })
  })


// **Edit ENDPOINT** \\
app.route('/home/:userid/edit_profile')
  .get((req, res) => {
    let userid = req.params.userid;

    // finding the current user info to display it inside the input boxes
    User.findOne({ _id: userid })
      .exec((err, userResult) => {
        res.render(process.cwd() + '/views/editProfile.html', { userid: userid, userInfo: userResult, message: "" });
      })

  })
  .post((req, res) => {
    const { name, surname, phone, email, password, password2 } = req.body;
    const userid = req.params.userid;
    const user = { _id: userid };

    let updateUser = {
      name: name,
      surname: surname,
      phone: phone,
      email: email,
      password: password
    }
    // if the two passwords don't match display error message
    if (password != password2) {
      User.findOne({_id:userid})
          .exec((err, userResult)=>{
            if(!err && userResult){
               res.render(process.cwd() + '/views/editProfile.html', { userid: userid, userInfo: userResult, message: "*The two passwords don't match" });
            }
        })
     
    } else {
      //else UPDATE the user info
      User.findOneAndUpdate(user, updateUser, { new: true })
        .exec((err, userResult) => {
          if(!err && userResult){
            res.render(process.cwd() + '/views/editProfile.html', { userid: userid, userInfo: userResult, message: "" });
          }
        });
    }

  })

// **Creating Car Opportunity ENDPOINT** \\
app.route('/home/:userid/addRegister')
  .get((req, res) => {
    const userid = req.params.userid;
    
    //finding the user to get their name and surname from register page
    User.findOne({ _id: userid })
      .exec((err, userResult) => {
        res.render(process.cwd() + '/views/addRegister.html', { userid: userid, userResult: userResult, message: "" });
      })
  })
  .post((req, res) => {
    const { departure, arrival, origin, days_available, destination, available_seats, owner, notes } = req.body;
    const userid = req.params.userid;
    const newRegister = new register({
      userid: userid,
      departure_time: departure,
      arrival_time: arrival,
      origin: origin,
      days_available: days_available,
      destination: destination,
      available_seats: available_seats,
      Owner: owner,
      notes: notes
    })
    register.find({ userid: userid })
      .exec((err, data) => {

        //getting the register that has overlap times with the one that the user is trying to create
          let lappingArr = data.filter((ele) => {
                let departure_time = new Date(departure).toUTCString();
                let arrival_time = ele.arrival_time.toUTCString();

                return (departure_time > ele.arrival_time.toUTCString() && departure_time < arrival_time || arrival_time > departure_time && arrival_time < new Date(arrival).toUTCString());
          })
        
        let isOverlapping = lappingArr.length > 0 ? true : false;
        // if the register (car pool opportunity) that the user is tring to create
        // overlap with the register (car pool opportunity) that the user already created
        // prevent them from creating it and send error message
        if (isOverlapping) {

          //finding the user to get their name and surname from register page
              User.findOne({ _id: userid })
              .exec((err, userResult) => {
                res.render(process.cwd() + '/views/addRegister.html', { userid: userid, userResult: userResult, message: "Couldn't save data, The Car Pool Overlap with another" });
              })
      
        } else {

          // else if car pool oppourtity don't overlap all user to create it
          newRegister.save((err, result) => {
            if (!err) {
              
             //finding the user to get their name and surname from register page
             User.findOne({ _id: userid })
             .exec((err, userResult) => {
               res.render(process.cwd() + '/views/addRegister.html', { userid: userid, userResult: userResult, message: "new Register added successfully" });
             })

            }
            else {
              //err happend while tring to save the register display error message

              //finding the user to get their name and surname from register page
              User.findOne({ _id: userid })
              .exec((err, userResult) => {
                res.render(process.cwd() + '/views/addRegister.html', { userid: userid, userResult: userResult, message: "Couldn't save new Register" });
              })
    
            }
          })
        }
      })
  })

// **Search View Page ENDPOINT** \\
app.route('/home/:userid/searchView')
  .get((req, res) => {
    
    const userid = req.params.userid;
    const destination = req.query.destination;

    // find the location destination the user joined
    register.find({ destination: destination })
            .where("userid").ne(userid).limit(20)
            .sort({createdAt:-1})
            .exec((err, searchResult) => {
        res.render(process.cwd() + '/views/searchView.html', { searchResults: searchResult, userid: userid, message: "" });
    })


  })
  .post((req, res) => {
    const userid = req.params.userid;
    const carid = req.query.carid;
    let seats_count

    // USER JOINING and LEAVING the car pool opportnities
    passenger.find({ passengerUserid: userid, carid: carid }, (err, passengerData) => {
      
      // if the user haven't join the car pool opportunity (the one the the user clicked on)
      // HANDLE THE SITUATION HERE
      if (passengerData.length == 0) {
        
        //finding the car opportunity that the user want to join from REGISTER TABLE
        register.findById({ _id: carid }).exec((err, registerData) => {

          passenger.find({ carid: carid })
            .exec((err, passengerResult) => {
              seats_count = passengerResult.length;

              let lappingArr = passengerData.filter((ele) => {
                let ownerInfo = ele.ownerInfo[0];
                let departure_time = new Date(registerData.departure_time).toUTCString();
                let arrival_time = ownerInfo.arrival_time.toUTCString();

                return (departure_time > ownerInfo.arrival_time.toUTCString() && departure_time < arrival_time || arrival_time > departure_time && arrival_time < new Date(arrival).toUTCString());


              })
              let isOverlapping = lappingArr.length > 0 ? true : false;

              // allow user to join the car opportunity if the seats are still available
              // and is not overlapping with othe car pool opportunies already joined
              if (seats_count <= registerData.available_seats) {
                if (passengerData != null && passengerData != []  && isOverlapping == false) {
                  let newRide = new passenger({
                    passengerUserid: userid,
                    carid: carid,
                    ownerInfo: registerData
                  })
                  newRide.save((err, data) => {
                    res.status(204).send()
                  })
                }
              }
            })
        })
      }
      else {
        // Let user leave the car pool opportunity
        passenger.findOneAndDelete({ passengerUserid: userid, carid: carid }).exec((err, data) => { res.status(204).send() })

      }
    })
  })


// **SHowing ALL CAR OPPORTUNITIES THAT THE USERS CREATED END POINT** \\
app.route('/home/:userid/allCarPool')
  .get((req, res) => {
    
    let userid = req.params.userid;
    register.find({})
            .where("userid").ne(userid)
            .sort({createdAt:-1})
            .exec((err, searchResult) => {
      res.render(process.cwd() + '/views/allCarPool.html', { searchResults: searchResult, userid: userid, message: "" });

    })
  })

// **SIMPLE Logout ENDPOIN** \\
app.route('/logout')
  .get((req, res) => {
    //redirect to login page
    res.redirect('/');
  })

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
})
