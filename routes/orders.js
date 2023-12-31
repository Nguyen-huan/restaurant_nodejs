const {Order} = require('../models/order');
const express = require('express');
const {OrderItem} = require("../models/order-item");
const router = express.Router();




router.get(`/`, async (req, res) => {
    const orderList = await Order.find().populate('customer', 'name').sort({'dateOrdered': -1});

    if (!orderList) {
        res.status(500).json({success: false})
    }
    res.send(orderList);
})

router.get(`/:id`, async (req, res) => {
    const order = await Order.findById(req.params.id)
        .populate('customer', 'name')
        .populate({
            path: 'orderItems', populate: {
                path: 'dish', populate: 'category'}
        });

    if (!order) {
        res.status(500).json({success: false})
    }
    res.send(order);
})


router.post('/', async (req, res) => {
    const orderItems__ = req.body.orderItems
    console.log(orderItems__)
    const orderItemsIds = Promise.all(req.body.orderItems.map(async (orderItem) => {
        let newOrderItem = new OrderItem({
            quantity: orderItem.quantity,
            dish: orderItem._id
        })

        newOrderItem = await newOrderItem.save();
        return newOrderItem._id;
    }))

    const orderItemsIdsResolved = await orderItemsIds;

    //price order
    const totalPrices = await Promise.all(orderItemsIdsResolved.map(async (orderItemId) => {
        const orderItem = await OrderItem.findById(orderItemId).populate('dish', 'price');
        const totalPrice = orderItem.dish.price * orderItem.quantity;


        return totalPrice;
    }))
    const totalPrice = totalPrices.reduce((a, b) => a + b, 0);

    let order = new Order({
        orderItems: orderItemsIdsResolved,
        shippingAddress1: req.body.shippingAddress1,
        shippingAddress2: req.body.shippingAddress2,
        city: req.body.city,
        zip: req.body.zip,
        country: req.body.country,
        phone: req.body.phone,
        status: req.body.status,
        totalPrice: totalPrice,
        customer: req.body.customer,
    })

    order = await order.save();

    if (!order)
        return res.status(400).send('the order cannot be created!')
    res.send(order);

})


//Update status order
router.put('/:id', async (req, res) => {
    const order = await Order.findByIdAndUpdate(
        req.params.id,
        {
            status: req.body.status
        },
        {new : true}   //du lieu se duoc cap nhat moi
    )
    if(!order) {
        res.status(400).send('the order cannot be created!')
    }
    res.send(order);
})





//Delete order

router.delete('/:id', async (req, res) => {
    Order.findByIdAndRemove(req.params.id).then( async order => {
        if(order) {
            await order.orderItems.map(async orderItem => {
                if (orderItem) {
                    await OrderItem.findByIdAndRemove(orderItem)
                } else {
                    return res.status(404).json({ success: false, message: 'OrderItem not found!' });
                }
            })
            res.status(200).json({success: true, message: 'the order is delete!'})
        } else {
            res.status(404).json({success: false, message: 'order not found!'})
        }
    }).catch(err => {
        return res.status(404).json({success: false, error: err})
    })
})


//Total Revenue(tong doanh thu/thang)
router.get('/get/totalsales', async (req, res)=> {
    const totalSales= await Order.aggregate([
        { $group: { _id: null , totalsales : { $sum : '$totalPrice'}}}
    ])

    if(!totalSales) {
        return res.status(400).send('The order sales cannot be generated')
    }

    res.send({totalsales: totalSales.pop().totalsales})
})


//count order list
router.get('/get/count', async (req, res) => {
    const orderCount = await Order.countDocuments();

    if(!orderCount) {
        res.status(500).json({success: false});
    }
    res.send({
        orderCount: orderCount
    })
})


// get order from user
router.get('/get/customerorders/:customerid', async (req, res) =>{
    const customerOrderList = await Order.find({customer: req.params.customerid}).populate({
        path: 'orderItems', populate: {
            path : 'dish', populate: 'category'}
    }).sort({'dateOrdered': -1});

    if(!customerOrderList) {
        res.status(500).json({success: false})
    }
    res.send(customerOrderList);
})


module.exports = router;