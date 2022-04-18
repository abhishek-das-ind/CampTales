const mongoose = require('mongoose');
const cities = require('./cities');
const { places, descriptors } = require('./seedHelpers');
const Campground = require('../models/campground');

mongoose.connect('mongodb://localhost:27017/yelp-camp', {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error"));
db.once("open", () => {
    console.log("Database connected");
});

const sample = array => array[Math.floor(Math.random() * array.length)];


const seedDB = async () => {
    await Campground.deleteMany({});
    for (let i = 0; i < 50; i++) {
        const random1000 = Math.floor(Math.random() * 1000);
        const price = Math.floor(Math.random() * 20) + 10;
        const camp = new Campground({
            author: '60f6d3bf5e909a6864efb661',
            location: `${cities[random1000].city}, ${cities[random1000].state}`,
            title: `${sample(descriptors)} ${sample(places)}`,
            description: 'Lorem ipsum dolor sit amet consectetur, adipisicing elit. Alias minus necessitatibus ea hic deleniti dolores laborum aperiam nostrum ab soluta aut, facilis voluptatem perferendis, quisquam harum! Dignissimos cumque sed facere.',
            price,
            geometry: {
                type: "Point",
                coordinates: [
                    cities[random1000].longitude,
                    cities[random1000].latitude
                ]
            },
            images: [
                {
                    url: 'https://res.cloudinary.com/dqfnqclbr/image/upload/v1626954702/YelpCamp/nnqvm6xfe1aq8emsdypp.jpg',
                    filename: 'YelpCamp/nnqvm6xfe1aq8emsdypp'
                },
                {
                    url: 'https://res.cloudinary.com/dqfnqclbr/image/upload/v1626954702/YelpCamp/abykoxvrrxiyxjjqz8do.jpg',
                    filename: 'YelpCamp/abykoxvrrxiyxjjqz8do'
                }
            ]

        })
        await camp.save();
    }
}

seedDB().then(() => {
    mongoose.connection.close();
})