const connection = require('../config/database.js');

const getHomepage = (req, res) => {

    return res.render('home.ejs')

};

module.exports = { getHomepage };
