const AppError = require("../utils/appError");

const handleCastErrorDB = err => {
    const message = `Invalid ${err.path}: ${err.value}`;
    return new AppError(message, 400);
}

const handleDuplicateFieldsDB = err => {
    // in value is found the first position
    // of the resulting array of matching every
    // text in quotes inside the errmsg, which if 
    // in postman is used in the body a duplicate
    // such as 'The Forest Hiker', this is what we
    // gonna get
    const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
    // console.log(value);

    const message = `Duplicate field value: ${value}. Please use another value!`;
    return new AppError(message, 400);
}

const handleValidationErrorDB = err => {
    // below is created an array of all the
    // error messages
    // Object.values are the objects seen inside error.errors
    // when sending invalid input data to a patch
    // request in postman in development mode
    const errors = Object.values(err.errors).map(el => el.message);

    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, 400);
}

const handleJWTError = () => new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () => new AppError('Your token has expired. Please log in again!', 401);

const sendErrorDev = (err, req, res) => {
    // A) API
    // test if URL starts with /api in that case 
    // don't render error page, if not render error page
    // originalUrl is the full url without the host, 
    // so it looks exactly like the route
    if (req.originalUrl.startsWith('/api')) {
        return res.status(err.statusCode).json({
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack
        });
    }
    // B) RENDERED PAGE
    console.error('ERROR!!', err);
    return res.status(err.statusCode).render('error', {
        title: 'Something went wrong!',
        msg: err.message
    });
}

const sendErrorProd = (err, req, res) => {
    // A) API
    if (req.originalUrl.startsWith('/api')) {
        // Operational, trusted error: send message to client
        if (err.isOperational) {
            return res.status(err.statusCode).json({
                status: err.status,
                message: err.message
            });
        }
        // Programming or other unknown error: don't leak error details
        // 1) Log error for us, the developers
        console.error('ERROR!!', err);
        // 2) Send generic message
        return res.status(500).json({
            status: 'error',
            message: 'Something went very wrong!'
        });
    }
    // B) RENDERED PAGE
    if (err.isOperational) {
        return res.status(err.statusCode).render('error', {
            title: 'Something went wrong!',
            msg: err.message
        });
    }
    // Programming or other unknown error: don't leak error details
    // 1) Log error for us, the developers
    console.error('ERROR!!', err);
    // 2) Send generic message
    return res.status(err.statusCode).render('error', {
        title: 'Something went wrong!',
        msg: 'Please try again later.'
    });
};

module.exports = (err, req, res, next) => {
    // console.log(err.stack);
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // it's desirable that when in development
    // we get as much info as possible of the 
    // error in order to fix it
    // but in production we just need to send
    // a user friendly error message

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, req, res);
    } else if (process.env.NODE_ENV === 'production') {
        let error = err;

        if (error.name === 'CastError') {
            error = handleCastErrorDB(error);
        }
        if (error.code === 11000) {
            error = handleDuplicateFieldsDB(error);
        }
        if (error.name === 'ValidationError') {
            error = handleValidationErrorDB(error);
        }
        if (error.name === 'JsonWebTokenError') {
            error = handleJWTError();
        }
        if (error.name = 'TokenExpiredError') {
            error = handleJWTExpiredError();
        }

        sendErrorProd(error, req, res);
    }
}