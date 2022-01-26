const express = require('express');
const router = express.Router();
const cors = require('cors')

router.use(cors())

//Controllers
// const Dashboard = require('../controller/Dashboard/Dashboard');
const EmployeeController = require('../Controller/Employee');
// const ItemsClass = require('../Models/items');
const Products = require('../Controller/Products');
const Profiles = require('../Controller/Profile');
const Records = require('../Controller/Records');
const Company = require('../Controller/Company');
const Daily = require('../Controller/Daily_Work');
const ItemUnit = require('../Controller/ItemUnit');
const Trailers = require('../Controller/Trailers'); 
const Partners = require('../Controller/partners');



//Employee Routes
// router.get('/Employees/Register',  EmployeeController.allowIfLoggedin, EmployeeController.grantAccess('createAny', 'profile'), EmployeeController.getRegistrationPage);
router.post('/Employees/add', EmployeeController.signup);
router.post('/login', EmployeeController.login);
router.get('/logout', EmployeeController.logout);
// router.get('/user/:userId',  EmployeeController.allowIfLoggedin, EmployeeController.grantAccess('readAny', 'profile'), EmployeeController.getUser);
// router.get('/Employees',  EmployeeController.allowIfLoggedin, EmployeeController.grantAccess('readAny', 'profile'), EmployeeController.getUsers);
// router.put('/user/:userId',  EmployeeController.allowIfLoggedin, EmployeeController.grantAccess('updateAny', 'profile'), EmployeeController.updateUser);
// router.get('/ChangePassword',  EmployeeController.allowIfLoggedin, EmployeeController.grantAccess('readOwn', 'profile'), EmployeeController.getChangePasswordPage);
// router.post('/ChangePassword/Change',  EmployeeController.allowIfLoggedin, EmployeeController.grantAccess('updateOwn', 'profile'), EmployeeController.UpdatePassword);
router.get('/MyAccount', EmployeeController.allowIfLoggedin, EmployeeController.grantAccess('readOwn', 'profile'), EmployeeController.getMyAccount);
// router.delete('/user/:userId',  EmployeeController.allowIfLoggedin, EmployeeController.grantAccess('deleteAny', 'profile'), EmployeeController.deleteUser);


// router.get('/Homepage',  Dashboard.allowIfLoggedin, Dashboard.getHomepage);

//Products
router.post('/Product', Products.allowIfLoggedin, Products.grantAccess('createAny', 'products'), Products.addNewItem); // Add new Product
router.get('/Products', Products.getProducts); // Get All Products
router.get('/Products/:productName', Products.allowIfLoggedin, Products.grantAccess('readAny', 'products'), Products.getSpecificProducts); // Get Single Product
router.get('/Products/:id/Invoices', Products.allowIfLoggedin, Products.grantAccess('readAny', 'products'), Products.getInvoiceofSpecificProduct); // Get Invoices of each Product
router.get('/Products/:id/Modification', Products.allowIfLoggedin, Products.grantAccess('readAny', 'products'), Products.EditProductUI);
router.post('/Products/:id/Update', Products.allowIfLoggedin, Products.grantAccess('readAny', 'products'), Products.EditProductOperation);
router.post('/Products/Model', Products.allowIfLoggedin, Products.grantAccess('readAny', 'products'), Products.SearchForProductModel);
router.get('/Products/Model/Company/:company', Products.allowIfLoggedin, Products.grantAccess('readAny', 'products'), Products.SearchForProductsinCompany);
router.post('/Products/Parser', Products.GetProductswithSearch); // Get All Products


router.get('/NewProduct', Products.allowIfLoggedin, Products.grantAccess('createAny', 'products'), Products.AddNewProduct); // Add new Product
// router.get('/:id/NewRequest', Products.AddNewRequest); // Add new Request per Product
router.post('/Products/:id/Requests', Products.allowIfLoggedin, Products.grantAccess('readAny', 'products'), Products.NewInvoice); // Add new Request per Product
router.post('/Products/:id/Requests/:paid', Products.allowIfLoggedin, Products.grantAccess('readAny', 'products'), Products.NewInvoiceForDebut); // Add new Request per Product
router.post('/Products/:id/Requests/Debut', Products.allowIfLoggedin, Products.grantAccess('readAny', 'products'), Products.NewInvoiceOfNoPrice); // Add new Request per Product
router.post('/Products/RemoveProduct/:id', Products.allowIfLoggedin, Products.grantAccess('deleteAny', 'products'), Products.RemoveProduct); // Add new Request per Product
router.get('/Products/Remove/:id', Products.allowIfLoggedin, Products.grantAccess('deleteAny', 'products'), Products.RemoveProductUI); // Add new Request per Product
router.post('/Products/NewTrailer', Products.allowIfLoggedin, Products.grantAccess('createAny', 'products'), Products.AppendNewTrailertoProduct)
router.get('/NewTrailer', Products.allowIfLoggedin, Products.grantAccess('createAny', 'products'), Products.AddNewTrailer); // Add new Request per Product
router.post('/Product/Trailers/:customerType', Products.allowIfLoggedin, Products.grantAccess('readAny', 'products'), Products.CheckForProductPriceInTrailer); // Add new Request per Product
router.put('/Invoices/:invoiceID/:customerid/Recover', Products.allowIfLoggedin, Products.grantAccess('updateAny', 'invoice'), Products.DeleteItemInInvoice); // Add new Request
router.get('/Invoice/:invoiceID/:productName', Records.allowIfLoggedin, Records.grantAccess('readAny', 'invoice'), Records.SearchForSpecificInvoice); // Add new Request
router.get('/Invoices/query', Records.allowIfLoggedin, Records.grantAccess('readAny', 'invoice'), Records.ShowSelectedDateOfInvoices); // Add new Request
router.post('/Invoices/Print', Records.allowIfLoggedin, Records.grantAccess('readAny', 'invoice'), Records.ShowSelectedDateOfInvoicesOperation); // Add new Request

//Records
router.get('/Records', Records.allowIfLoggedin, Records.grantAccess('readAny', 'records'), Records.Records); // Records

//Company
router.get('/Company/:companyName', Company.allowIfLoggedin, Company.grantAccess('readAny', 'company'), Company.CheckForCompanyProducts);
router.post('/Company', Company.allowIfLoggedin, Company.grantAccess('createAny', 'company'), Company.AddNewCompany);
router.get('/Companies', Company.allowIfLoggedin, Company.grantAccess('readAny', 'company'), Company.GetAllCompanies)


// router.post('/Products/:id/NewTrailer', Products.AppendNewTrailertoProduct); // Add new Trailer for This Product
// router.post('/Products/:id/Invoice', Products.AddNewInvoiceForCustomer) // Add new Invoice for each Customer
router.get('/Products/:id/NewRecover', Products.allowIfLoggedin, Products.grantAccess('readAny', 'products'), Products.AddNewRecover); // Add new Request
router.post('/Products/:id/Recovered', Products.allowIfLoggedin, Products.grantAccess('readAny', 'products'), Products.RecoveredSoldProducts) // Recover old Invoice for each Customer

//Task
router.post('/Daily', Daily.allowIfLoggedin, Daily.grantAccess('readAny', 'products'), Daily.AddnewTask) // Add New Task in Daily
router.get('/Daily', Daily.allowIfLoggedin, Daily.grantAccess('readAny', 'products'), Daily.GetAllTasks) // Add New Task in Daily
router.get('/NewDailyTask', Daily.allowIfLoggedin, Daily.grantAccess('readAny', 'products'), Daily.GetNewTaskUI) // Add New Task in Daily


//Customers
router.post('/Profile', Profiles.allowIfLoggedin, Profiles.grantAccess('readAny', 'profile'), Profiles.addNewCustomer); // Add new Profile
router.get('/Profiles', Profiles.allowIfLoggedin, Profiles.grantAccess('readAny', 'profile'), Profiles.GetAllCustomers); // Get All Customers Profile
router.get('/Profiles/:id/invoices', Profiles.allowIfLoggedin, Profiles.grantAccess('readAny', 'profile'), Profiles.GetAllInvoiceForCustomers); // Get All invoice for specific Profile
router.get('/Profile/:id/NewRequest', Profiles.allowIfLoggedin, Profiles.grantAccess('readAny', 'profile'), Profiles.AddNewRequest); // Add new Request per Customer
router.get('/Profiles/:invoiceID/Print', Profiles.allowIfLoggedin, Profiles.grantAccess('readAny', 'profile'), Profiles.PrintSelectedInvoice); // Print Invoice
router.get('/Profiles/AddNew', Profiles.allowIfLoggedin, Profiles.grantAccess('readAny', 'profile'), Profiles.CreateNewProfile);
router.get('/Profiles/:itemModel/:itemName/:itemType/:color/:itemUnit', Profiles.allowIfLoggedin, Profiles.grantAccess('readAny', 'profile'), Profiles.CheckForTrailerInRequest);
router.get('/Profiles/Customer/Types', Profiles.allowIfLoggedin, Profiles.grantAccess('readAny', 'profile'), Profiles.ShowCustomerType);
router.get('/Profiles/Customer/NewTypes', Profiles.allowIfLoggedin, Profiles.grantAccess('readAny', 'profile'), Profiles.NewCustomerType);
router.post('/Profiles/Customer/NewTypes', Profiles.allowIfLoggedin, Profiles.grantAccess('readAny', 'profile'), Profiles.NewCustomerTypeOperation);
router.get('/Profiles/Invoices/:id', Profiles.allowIfLoggedin, Profiles.grantAccess('readAny', 'profile'), Profiles.PrintAllInvoiceforCustomer); // Get All invoice for specific Profile
router.delete('/Profiles/:id', Profiles.allowIfLoggedin, Profiles.grantAccess('readAny', 'profile'), Profiles.RemoveProfile); // Get All invoice for specific Profile
router.get('/Profiles/Debtors', Profiles.allowIfLoggedin, Profiles.grantAccess('readAny', 'profile'), Profiles.debtors); // Get All Debtors

//Item Unit
router.post('/Products/ItemUnit',  ItemUnit.AddNewItemUnit); // Get All Customers Profile


//Trailers
router.get('/Trailers', Trailers.Trailers); // Get All Trailers




//Partners
router.get('/Partners', Partners.allowIfLoggedin, Trailers.grantAccess('readAny', 'profile'), Partners.GetPartners); // Get All Partners
router.post('/Partners', Partners.allowIfLoggedin, Trailers.grantAccess('createAny', 'profile'), Partners.AddNewPartner); // Add New Partner
router.get('/Partners/request', Partners.allowIfLoggedin, Trailers.grantAccess('readAny', 'profile'), Partners.AddNewRequestForPartner); // Get All Partners
router.post('/Partners/Request/NewRequest', Partners.allowIfLoggedin, Trailers.grantAccess('createAny', 'profile'), Partners.AddNewRequestForPartnerOperation); // Add New Partner



module.exports = router;