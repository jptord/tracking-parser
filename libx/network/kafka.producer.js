const { Kafka } = require('kafkajs');

class KafkaProducer{
    
    constructor(opts={}){      
        this.kafka      = null;  
        this.isConnected    = true;
        this.options = opts;
    }
    start(){
        this.createServer(this.options);
    }
    createServer(opts={}){
        this.kafka      = new Kafka({
            clientId    : opts.id,
            brokers     : opts.brokers,
          });
        this.producer       = this.kafka.producer({
            allowAutoTopicCreation: true,
            transactionTimeout: 1000});
        this.isConnected    = true;
        this.connectProducer();  
    }
    connectProducer(){        
        
    }
    async send(topic,msg,key){
      //  if ( !this.producer.isConnected() ) return ;
        try{
            await this.producer.connect()
            await this.producer.send({
                topic: topic,
                messages: [{key:key,value:msg}],
            })
        }catch(e){
            console.log(e);
            this.isConnected    =   false;            
        }
    }
}


module.exports = { KafkaProducer } ;