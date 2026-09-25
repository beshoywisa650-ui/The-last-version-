import { SalesRow, LoadedFileMeta, ColumnMapping } from '../types';

/**
 * Generates realistic sample sales dataset for demonstration and instant testing.
 */
export function generateSampleSalesData(): {
  rows: SalesRow[];
  meta: LoadedFileMeta;
  mapping: ColumnMapping;
} {
  const regions = ['Cairo', 'Giza', 'Alexandria', 'Delta', 'Upper Egypt'];
  const branches = ['Nasr City', 'Heliopolis', 'Dokki', 'Mohandessin', 'Fayoum', 'Mansoura', 'Tanta', 'Smouha'];
  const bricks = ['Brick 101', 'Brick 102', 'Brick 103', 'Brick 201', 'Brick 202', 'Brick 301', 'Brick 401'];
  const addresses = ['El-Tahrir St', 'El-Galaa St', 'Abbas El-Akkad', 'Makram Ebeid', 'Gameat El-Dowal', 'Corniche Road'];

  const products = [
    { brand: 'Panadol', product: 'Panadol Extra 500mg', item: 'Panadol Extra 24 Tabs', price: 45 },
    { brand: 'Panadol', product: 'Panadol Cold & Flu', item: 'Panadol C&F 24 Tabs', price: 55 },
    { brand: 'Augmentin', product: 'Augmentin 1g Tabs', item: 'Augmentin 1g 14 Tabs', price: 135 },
    { brand: 'Augmentin', product: 'Augmentin 625mg Tabs', item: 'Augmentin 625mg 10 Tabs', price: 95 },
    { brand: 'Concor', product: 'Concor 5mg Plus', item: 'Concor 5 Plus 30 Tabs', price: 82 },
    { brand: 'Concor', product: 'Concor 2.5mg', item: 'Concor 2.5mg 30 Tabs', price: 60 },
    { brand: 'Cataflam', product: 'Cataflam 50mg', item: 'Cataflam 50mg 20 Tabs', price: 51 },
    { brand: 'C-Retard', product: 'C-Retard 500mg', item: 'C-Retard 500mg 10 Caps', price: 28 },
    { brand: 'Omega 3', product: 'Omega 3 Plus', item: 'Omega 3 Plus 30 Caps', price: 110 },
    { brand: 'Brufen', product: 'Brufen 400mg', item: 'Brufen 400mg 30 Tabs', price: 42 }
  ];

  const rows: SalesRow[] = [];
  let rowId = 1;

  // Generate ~150 realistic sales transactions
  for (let i = 0; i < 150; i++) {
    const region = regions[i % regions.length];
    const branch = branches[(i * 3) % branches.length];
    const brick = bricks[(i * 2) % bricks.length];
    const address = addresses[(i * 5) % addresses.length];
    const prod = products[i % products.length];

    // Base quantity varied by index
    const qty = Math.floor(15 + ((i * 17) % 180) + ((i % 5) * 20));
    const value = qty * prod.price;
    const target = Math.round(qty * (0.8 + ((i % 6) * 0.1)));

    rows.push({
      region,
      branch,
      address,
      brick,
      brand: prod.brand,
      product: prod.product,
      item: prod.item,
      qty,
      value,
      target,
      raw: {
        '#': rowId++,
        Region: region,
        Branch: branch,
        Address: address,
        Brick: brick,
        Brand: prod.brand,
        Product: prod.product,
        Item: prod.item,
        QTY: qty,
        Value: value,
        Target: target
      }
    });
  }

  const columns = ['Region', 'Branch', 'Address', 'Brick', 'Brand', 'Product', 'Item', 'QTY', 'Value', 'Target'];

  const meta: LoadedFileMeta = {
    fileName: 'Sample_Pharma_Sales_2026.xlsx',
    sheetName: 'Sales Data',
    rowCount: rows.length,
    columnCount: columns.length,
    loadedAt: Date.now(),
    columns,
    sheetNames: ['Sales Data'],
    fileSize: 45200
  };

  const mapping: ColumnMapping = {
    region: 'Region',
    branch: 'Branch',
    address: 'Address',
    brick: 'Brick',
    brand: 'Brand',
    product: 'Product',
    item: 'Item',
    qty: 'QTY',
    value: 'Value',
    target: 'Target'
  };

  return { rows, meta, mapping };
}
