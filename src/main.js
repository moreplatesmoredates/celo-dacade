import Web3 from "web3";
import { newKitFromWeb3 } from "@celo/contractkit";
import BigNumber from "bignumber.js";
import marketplaceAbi from "../contract/marketplace.abi.json";
import erc20Abi from "../contract/erc20.abi.json";

const ERC20_DECIMALS = 18;
const MPContractAddress = "0x398486Fd366Ed4eE766929BC9a70F6Cc09938878";
const cUSDContractAddress = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";

let kit;
let contract;
let products = [];
let quantity = 1;

const connectCeloWallet = async function () {
  if (window.celo) {
    notification("⚠️ Please approve this DApp to use it.");
    try {
      await window.celo.enable();
      notificationOff();

      const web3 = new Web3(window.celo);
      kit = newKitFromWeb3(web3);

      const accounts = await kit.web3.eth.getAccounts();
      kit.defaultAccount = accounts[0];

      contract = new kit.web3.eth.Contract(marketplaceAbi, MPContractAddress);
    } catch (error) {
      notification(`⚠️ ${error}.`);
    }
  } else {
    notification("⚠️ Please install the CeloExtensionWallet.");
  }
};

async function approve(_price) {
  const cUSDContract = new kit.web3.eth.Contract(erc20Abi, cUSDContractAddress);

  const result = await cUSDContract.methods
    .approve(MPContractAddress, _price)
    .send({ from: kit.defaultAccount });
  return result;
}

const getBalance = async function () {
  const totalBalance = await kit.getTotalBalance(kit.defaultAccount);
  const cUSDBalance = totalBalance.cUSD.shiftedBy(-ERC20_DECIMALS).toFixed(2);
  document.querySelector("#balance").textContent = cUSDBalance;
};

const getProducts = async function () {
  const _productsLength = await contract.methods.getProductsLength().call();
  const _products = [];
  for (let i = 0; i < _productsLength; i++) {
    let _product = new Promise(async (resolve, reject) => {
      let p = await contract.methods.readProduct(i).call();
      resolve({
        index: i,
        owner: p[0],
        name: p[1],
        image: p[2],
        description: p[3],
        pgp: p[4],
        price: new BigNumber(p[5]),
        stock: p[6],
      });
    });
    _products.push(_product);
  }
  products = await Promise.all(_products);
  renderProducts();
};

const getOrders = async function () {
  let _orders = await contract.methods.readOrders().call();
  let _orders_obj = [];
  _orders.forEach((o) => {
    _orders_obj.push({
      encrypted_message: o.encrypted_message,
      product_id: o.product_id,
    });
  });
  if (_orders_obj.length > 0) {
    let list_el = document.querySelector("#my-orders");
    _orders_obj.forEach((o) => {
      let child = document.createElement("li");
      child.className =
        "list-group-item d-flex justify-content-between align-items-center";
      child.innerHTML = `ID: ${o.product_id}, Encrypted Message: ${o.encrypted_message}`;
      list_el.appendChild(child);
    });
  } else {
    document.querySelector('#orders-desc').innerText = "You have received no orders"
  }
};

function renderProducts() {
  document.getElementById("marketplace").innerHTML = "";
  products.forEach((_product) => {
    const newDiv = document.createElement("div");
    newDiv.className = "col-md-4";
    newDiv.innerHTML = productTemplate(_product);
    document.getElementById("marketplace").appendChild(newDiv);
  });
}

function renderOrders() {
  if (
    orders_obj &&
    document.getElementById("#my-orders") &&
    orders_obj.length > 0
  ) {
    document.getElementById("#my-orders").innerHTML =
      JSON.stringify(orders_obj);
  }
}

function productTemplate(_product) {
  return `
    <div class="card mb-4">
      <img class="card-img-top" src="${_product.image}" alt="...">
      <div class="position-absolute top-0 end-0 bg-warning mt-4 px-2 py-1 rounded-start">
        ${_product.stock} In Stock
      </div>
      <div class="card-body text-left p-4 position-relative">
        <div class="translate-middle-y position-absolute top-0">
        ${identiconTemplate(_product.owner)}
        </div>
        <h2 class="card-title fs-4 fw-bold mt-2">${_product.name}</h2>
        <p class="card-text mb-4" style="min-height: 82px">
          ${_product.description}             
        </p>
        <p class="card-text mt-4">
        <i class="bi bi-key"></i>
          <span>${
            _product.pgp ? _product.pgp : "Seller has not supplied PGP key"
          }</span>
        </p>
        <div class="input-group pb-2">
          <textarea id="encrypted-message" class="form-control" placeholder="Encrypted message for seller" aria-label="With textarea"></textarea>
        </div>
        <div class="d-grid gap-2">
          <a class="btn btn-lg btn-outline-dark buyBtn fs-6 p-3 ${
            _product.stock < 1 && "disabled"
          }" id=${_product.index}>
            ${
              _product.stock > 0
                ? `Buy for ${_product.price
                    .shiftedBy(-ERC20_DECIMALS)
                    .toFixed(2)} cUSD`
                : "Out of Stock"
            }
          </a>
        </div>
      </div>
    </div>
  `;
}

function identiconTemplate(_address) {
  const icon = blockies
    .create({
      seed: _address,
      size: 8,
      scale: 16,
    })
    .toDataURL();

  return `
  <div class="rounded-circle overflow-hidden d-inline-block border border-white border-2 shadow-sm m-0">
    <a href="https://alfajores-blockscout.celo-testnet.org/address/${_address}/transactions"
        target="_blank">
        <img src="${icon}" width="48" alt="${_address}">
    </a>
  </div>
  `;
}

function notification(_text) {
  document.querySelector(".alert").style.display = "block";
  document.querySelector("#notification").textContent = _text;
}

function notificationOff() {
  document.querySelector(".alert").style.display = "none";
}

window.addEventListener("load", async () => {
  notification("⌛ Loading...");
  await connectCeloWallet();
  await getBalance();
  await getProducts();
  await getOrders();
  notificationOff();
});

document
  .querySelector("#newProductBtn")
  .addEventListener("click", async (e) => {
    console.log("ss");
    const params = [
      document.getElementById("newProductName").value,
      document.getElementById("newImgUrl").value,
      document.getElementById("newProductDescription").value,
      new BigNumber(document.getElementById("newPrice").value)
        .shiftedBy(ERC20_DECIMALS)
        .toString(),
      document.getElementById("newStock").value,
    ];
    notification(`⌛ Adding "${params[0]}"...`);
    try {
      const result = await contract.methods
        .writeProduct(...params)
        .send({ from: kit.defaultAccount });
    } catch (error) {
      notification(`⚠️ ${error}.`);
    }
    notification(`🎉 You successfully added "${params[0]}".`);
    getProducts();
  });

document.querySelector("#marketplace").addEventListener("click", async (e) => {
  if (e.target.className.includes("buyBtn")) {
    const index = e.target.id;
    const item_el = document.querySelector("#marketplace").childNodes[index];
    const encrypted_message = item_el.querySelector("#encrypted-message").value;
    console.log(encrypted_message);
    notification("⌛ Waiting for payment approval...");
    try {
      await approve(products[index].price);
    } catch (error) {
      notification(`⚠️ ${error}.`);
    }
    notification(`⌛ Awaiting payment for "${products[index].name}"...`);
    try {
      const result = await contract.methods
        .buyProduct(index, encrypted_message)
        .send({ from: kit.defaultAccount });
      notification(`🎉 You successfully bought "${products[index].name}".`);
      getProducts();
      getBalance();
      getOrders();
    } catch (error) {
      notification(`⚠️ ${error}.`);
    }
  }
});
document.querySelector("#pgp-section").addEventListener("click", async (e) => {
  if (e.target.className.includes("submit-pgp")) {
    console.log("yo");
    const pgp = document.querySelector("#your-public-pgp").value;
    console.log(pgp);
    notification("⌛ Waiting for PGP public key change approval...");
    notification(`⌛ Awaiting change PGP public key"...`);
    try {
      const result = await contract.methods
        .setVendorsPublicPGP(pgp)
        .send({ from: kit.defaultAccount });
      notification(`🎉 You successfully changed your PGP public key."`);
      getProducts();
      getBalance();
      getOrders();
      document.querySelector("#your-public-pgp").value = "";
    } catch (error) {
      notification(`⚠️ ${error}.`);
    }
  }
});
