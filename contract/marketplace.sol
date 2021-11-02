// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

interface IERC20Token {
  function transfer(address, uint256) external returns (bool);
  function approve(address, uint256) external returns (bool);
  function transferFrom(address, address, uint256) external returns (bool);
  function totalSupply() external view returns (uint256);
  function balanceOf(address) external view returns (uint256);
  function allowance(address, address) external view returns (uint256);

  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract Marketplace {

    uint internal productsLength = 0;
    address internal cUsdTokenAddress = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;

    struct Product {
        address payable owner;
        string name;
        string image;
        string description;
        uint price;
        uint stock;
    }
    
    struct Order {
        string encrypted_message;
        uint product_id;
    }

    mapping (uint => Product) internal products;
    mapping (address => string) internal ownerPGP;
    mapping (address => Order[]) internal orders;
    
    
    modifier inStock(uint _index) {
        require(products[_index].stock > 0);
        _;
    }
    
    function setVendorsPublicPGP(string memory _pgp_public) public {
        ownerPGP[msg.sender] = _pgp_public;
    }

    function writeProduct(
        string memory _name,
        string memory _image,
        string memory _description, 
        uint _price, 
        uint _stock
    ) public {
        products[productsLength] = Product(
            payable(msg.sender),
            _name,
            _image,
            _description,
            _price,
            _stock
        );
        productsLength++;
        
    }
    

    function readProduct(uint _index) public view returns (
        address payable,
        string memory, 
        string memory, 
        string memory, 
        string memory, 
        uint, 
        uint
    ) {
        return (
            products[_index].owner,
            products[_index].name, 
            products[_index].image, 
            products[_index].description, 
            ownerPGP[products[_index].owner],
            products[_index].price,
            products[_index].stock
        );
    }
    
    function readOrders() public view returns (
        Order[] memory
    ) {
        return (
            orders[msg.sender]
        );
    }
    
    function createOrder(address _seller, string memory _encrypted_message, uint _product_id) private {
        orders[_seller].push(Order(
            _encrypted_message,
            _product_id
        ));
    }

    function buyProduct(uint _index, string memory _encrypted_message) public inStock(_index) {
        require(
          IERC20Token(cUsdTokenAddress).transferFrom(
            msg.sender,
            products[_index].owner,
            products[_index].price
          ),
          "Transfer failed."
        ); 
        createOrder(products[_index].owner, _encrypted_message, _index);
        products[_index].stock--;
    }
    
    function getProductsLength() public view returns (uint) {
        return (productsLength);
    }
}