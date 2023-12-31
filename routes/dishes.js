const {Dish} = require('../models/dish');
const { Category } = require('../models/category');
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');



//validation upload file image
const TYPE_FILE_MAP = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg'
}
//storing files image to disk
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const isValid = TYPE_FILE_MAP[file.mimetype];
        let uploadError = new Error('invalid image type');

        if(isValid) {
            uploadError = null
        }
        cb(uploadError, 'public/uploads')
    },
    filename: function (req, file, cb) {
        const fileName = file.originalname.split(' ').join('-');
        const extension = TYPE_FILE_MAP[file.mimetype];
        cb(null, `${fileName} - ${Date.now()}.${extension}`)
    }
})

const uploadOptions = multer({ storage: storage })

router.get(`/pagination`, async (req, res) => {
    const page = parseInt(req.query.page) || 1; 
    const perPage = 3;
  
    try {
        const totalCount = await Dish.countDocuments();
        const totalPages = Math.ceil(totalCount / perPage);

        const result = await Dish.find({}).populate('category')
        .skip((page - 1) * perPage)
        .limit(perPage);

        res.json({
        totalPages: totalPages,
        currentPage: page,
        dishes: result
        });
    } catch (error) {
      res.status(500).json({ message: 'Internal Server Error' });
    }
})

router.get(`/`, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const perPage = 3;

    try {
        const dishList = await Dish.find({}).populate('category')
        .skip((page - 1) * perPage)
        .limit(perPage);
        if(!dishList) {
            res.status(500).json({success: false})
        }
        res.send(dishList);
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
})


// router.get(`/`, async (req, res) => {
//     const dishList = await Dish.find().populate('category');

//     if(!dishList) {
//         res.status(500).json({success: false})
//     }

//     res.send(dishList);
// })

router.get('/:id', async (req, res) => {
    const dish = await Dish.findById(req.params.id).populate('category');

    if(!dish) {
        res.status(500).json({success: false})
    }
    res.send(dish);
})


router.post(`/`, uploadOptions.single('image'),
    async (req, res) => {
        const category = await Category.findById(req.body.category);
        if (!category) return res.status(400).send('Invalid Category');

        const file = req.file;
        if (!file) return res.status(400).send('No image in the request');

        const fileName = req.file.filename
        const basePath = `${req.protocol}://${req.get('host')}/public/upload/`;
        console.log(fileName)
        console.log(basePath)

        let dish = new Dish({
            name: req.body.name,
            description: req.body.description,
            richDescription: req.body.richDescription,
            image: `${basePath}${fileName}`,
            price: req.body.price,
            category: req.body.category,
            rating: req.body.rating,
            numReviews: req.body.numReviews,
            isFeatured: req.body.isFeatured
        })

        dish = await dish.save();
        if (!dish) {
            return res.status(500).send('The dish cannot be create!');
        }
        res.send(dish);
    });


router.put('/:id',uploadOptions.single('image'), async (req, res) => {
    if(!mongoose.isValidObjectId(req.params.id)) {
        res.status(400).send('Invalid product id')
    }

    const category = await Category.findById(req.body.category);
    if (!category) return res.status(400).send('Invalid Category');

    const dish = await Dish.findById(req.params.id);
    if(!dish) return res.status(400).send('Invalid Dish')

    const file = req.file;
    let imagePath;
    if(file) {
        const fileName = file.filename;
        const basePath = `${req.protocol}://${req.get('host')}/public/upload/`;
        imagePath =`${basePath}${fileName}`
    } else {
        imagePath = dish.image;
    }

    const updateDish = await Dish.findByIdAndUpdate(
        req.params.id,
        {
            name: req.body.name,
            description: req.body.description,
            richDescription: req.body.richDescription,
            image: imagePath,
            price: req.body.price,
            category: req.body.category,
            rating: req.body.rating,
            numReviews: req.body.numReviews,
            isFeatured: req.body.isFeatured
        },
        { new: true } //du lieu se duoc cap nhat moi
    )
    if(!updateDish) {
        res.status(400).send('the dish cannot be create!')
    }
    res.send(updateDish);
})


router.delete('/:id', (req, res) => {
    Dish.findByIdAndRemove(req.params.id).then(dish => {
        if(dish) {
            return res.status(202).json({success: true, message: 'the category is delete!'})
        } else {
            return res.status(404).json({success: false, message: 'category not found!'})
        }
    }).catch(err => {
        return res.status(404).json({success: false, error: err})
    })
})




router.get(`/get/count`, async (req, res) => {
    const dishCount = await Dish.countDocuments();

    if (!dishCount) {
        res.status(500).json({ success: false });
    }
    res.send({
        dishCount: dishCount,
    });
});

router.get(`/get/featured/:count`, async (req, res) => {
    const count = req.params.count ? req.params.count : 0;
    const dishes = await Dish.find({ isFeatured: true }).limit(+count);

    if (!dishes) {
        res.status(500).json({ success: false });
    }
    res.send(dishes);
});


//upload files images to gallery-images
router.put(
    '/gallery-images/:id',
    uploadOptions.array('images', 10),
    async (req, res) => {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).send('Invalid dish Id');
        }
        const files = req.files;
        let imagesPaths = [];
        const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;

        if (files) {
            files.map((file) => {
                imagesPaths.push(`${basePath}${file.filename}`);
            });
        }

        const dish = await Dish.findByIdAndUpdate(
            req.params.id,
            {
                images: imagesPaths,
            },
            { new: true }
        );

        if (!dish)
            return res.status(500).send('the gallery cannot be updated!');

        res.send(dish);
    }
);




module.exports = router;