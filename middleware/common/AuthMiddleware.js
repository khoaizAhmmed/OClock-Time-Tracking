const jwt = require('jsonwebtoken')
const dotenv = require('dotenv')
const createError = require('http-errors')
const LoginModel = require('../../models/LoginModel')

dotenv.config()

const checkUser = (req, res, next) => {
  const token = req.cookies.jwt
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
      if (err) {
        res.locals.user = null;
        next()
      } else {
        console.log('=====>mail', req.body.userMailFormDB);

        const user = await LoginModel.getUserMail(decodedToken.userMailFormDB)
        console.log('=====> usre', user);

        res.locals.user = user;
        next()
      }
    })
  } else {
    res.locals.user = null;
    // res.redirect('/')

    next()
  }
}

const checkLogin = (req, res, next) => {
  const cookies = Object.keys(req.signedCookies).length > 0 ? req.signedCookies : null
  if (cookies) {
    try {
      const token = cookies[process.env.COOKIE_NAME]
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      req.user = decoded
      if (res.locals.html) {
        res.locals.loggedInUser = decoded
      }
      next()
    } catch (err) {
      if (res.locals.html) {
        res.redirect('/');
      } else {
        res.status(500).json({
          errors: {
            common: {
              msg: 'Authentication failure!',
            },
          },
        });
      }
    }
  } else if (res.locals.html) {
    res.redirect('/');
  } else {
    res.status(401).json({
      errors: {
        common: {
          msg: 'Authentication failure!',
        },
      },
    });
  }
}

const checkCurrentLogin = (req, res, next) => {
  const token = req.cookies.jwt;

  if (token) {
    res.redirect('/');

    // res.send("yes ace")
  }
  next()
}

const redirectLoggedIn = (req, res, next) => {
  const cookie = Object.keys(req.signedCookies).length > 0 ? req.signedCookies : null
  if (!cookie) {
    next()
  } else {
    res.redirect('/dashboard');
  }
}

function requireRole(role) {
  return function (req, res, next) {
    console.log(req.user)
    if (req.user.userRole && role.includes(req.user.userRole)) {
      next();
    } else if (res.locals.html) {
      next(createError(401, 'You are not authorized to access this page!'));
    } else {
      res.status(401).json({
        errors: {
          common: {
            msg: 'You are not authorized!',
          },
        },
      });
    }
  };
}

module.exports = {
  checkLogin, checkUser, checkCurrentLogin, redirectLoggedIn, requireRole,
}
