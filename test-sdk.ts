import { createClient } from './Root/SDK/src/index';

const gb = createClient('http://localhost:8787', 'sk_test_d4243db68bef_d78f5f24f5a34e06bc86a51d91811568');

async function run() {
    try {
        console.log('Criando Produto...');
        const prod = await gb.from('products').insert({
            name: 'Produto Node Test',
            price: 5000,
            stock: 10
        });
        console.log('Produto:', prod);

        console.log('Comprando Produto...');
        const checkout = await gb.orders.checkout({
            customer_email: 'node@teste.com',
            customer_name: 'Node Teste',
            payment_method: 'pix',
            items: [{ product_id: (prod.data || prod).id, quantity: 1 }]
        });
        console.log('Checkout:', checkout);
    } catch(err) {
        console.error('Erro SDK:', err);
    }
}
run();
