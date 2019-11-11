using System;
using System.IO;
using System.Text;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace logging_service
{
    class Program
    {
        private const string queue = "logging_queue";
        private const string exchange = "order_exchange";
        private const string input_routing_key = "create_order";

        // Kíkja á þennan API varðandi dotnet og RabbitMQ!!
        // https://www.rabbitmq.com/dotnet-api-guide.html
        public static void Main()
        {
            var factory = new ConnectionFactory();
            using (var connection = factory.CreateConnection())
            using (var channel = connection.CreateModel())
            {
                channel.QueueDeclare(queue, true, false, false, null);

                channel.ExchangeDeclare(exchange, "direct", true);

                channel.QueueBind(queue, exchange, input_routing_key, null);

                var consumer = new EventingBasicConsumer(channel);
                consumer.Received += (model, ea) =>
                {
                    var body = ea.Body;
                    var message = Encoding.UTF8.GetString(body);
                    Console.WriteLine(" [x] Received {0}", message);

                    using (StreamWriter outputFile = new StreamWriter("log.txt", append: true))
                    {
                        outputFile.WriteLine("Log: " + message + '\n');
                    }
                };

                channel.BasicConsume(queue, true, consumer);
                Console.ReadLine();
            }
        }
    }
}
