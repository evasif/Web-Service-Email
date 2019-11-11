const express = require('express');
const bodyParser = require('body-parser');
const PORT = 4000;
const app = express();
const amqp = require('amqplib/callback_api');

const messageBrokerInfo = {
    exchanges: {
        order: 'order_exchange'
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

// Þarf að gera þetta líka fyrir routing key og binda?
const configureMessageBroker = channel => {
    Object.values(messageBrokerInfo.exchanges).forEach(val => {
        channel.assertExchange(val, 'direct', { durable: true });
    });
};


(async () => {
    const messageBrokerConnection = await createMessageBrokerConnection();
    const channel = await createChannel(messageBrokerConnection);

    configureMessageBroker(channel);

    const { order } = messageBrokerInfo.exchanges;
    const { createOrder } = messageBrokerInfo.routingKeys;

    app.use(bodyParser.json());

    // TODO: Setup route
    app.post('/api/create_order', (req, res) => {
        const { body } = req;
        const bodyJson = JSON.stringify(body);
        channel.publish(order, createOrder, new Buffer(bodyJson));
        console.log(`[x] Sent: ${bodyJson}`);
        return res.status(200).send();


    })

    app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));
})().catch(e => console.error(e));