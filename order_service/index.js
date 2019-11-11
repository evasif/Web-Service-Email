const express = require('express');
const bodyParser = require('body-parser');
const PORT = 4000;
const app = express();
const amqp = require('amqplib/callback_api');
const { Order, OrderItem } = require('./data/db')

const messageBrokerInfo = {
    exchanges: {
        order: 'order_exchange'
    },
    queues: {
        addQueue: 'order_queue'
    },
    routingKeys: {
        createOrder: 'create_order'
    }
}

const createMessageBrokerConnection = () => new Promise((resolve, reject) => {
    amqp.connect('amqp://localhost', (err, conn) => {
        if (err) { reject(err); }
        resolve(conn);
    });
});

const createChannel = connection => new Promise((resolve, reject) => {
    connection.createChannel((err, channel) => {
        if (err) { reject(err); }
        resolve(channel);
    });
});

// Þarf að gera þetta líka fyrir queue og routing key og ?
const configureMessageBroker = channel => {
    const { order } = messageBrokerInfo.exchanges;
    const { addQueue } = messageBrokerInfo.queues;
    const { createOrder } = messageBrokerInfo.routingKeys;

    channel.assertExchange(order, 'direct', { durable: true });
    channel.assertQueue(addQueue, { durable: true });
    channel.bindQueue(addQueue, order, createOrder);
};


(async () => {
    const messageBrokerConnection = await createMessageBrokerConnection();
    const channel = await createChannel(messageBrokerConnection);

    configureMessageBroker(channel);

    const { order_exchange } = messageBrokerInfo.exchanges;
    const { addQueue } = messageBrokerInfo.queues;
    const { create_order } = messageBrokerInfo.routingKeys;

    // create a new order using information from the event
    // create order items using information from the same event

    channel.consume(addQueue, data => {
        const dataJson = JSON.parse(data.content.toString());
        console.log(dataJson.email);

        var total = 0;
        dataJson.items.forEach(item => {
            total += item.quantity * item.unitPrice;
        });

        var order = Order.create({
            customerEmail: dataJson.email,
            orderDate: Date.now(),
            totalPrice: total

        }, (err, order) => {
            console.log(order);
            dataJson.items.forEach(item => {
                OrderItem.create({
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    rowPrice: item.quantity * item.unitPrice,
                    orderId: order.id
                })
            });
        });






    }, { noAck: true });


})().catch(e => console.error(e));