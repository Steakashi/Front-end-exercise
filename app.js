var bookList = new Vue({

  el: '#books',

  data: {
    book: { isbn: '', title: '', cover: '', price:'', quantity: 0},
    reduction: { type: '', sliceValue: '', value: ''},
    books: [],
    reductions: []
  },

  // Initalize data before execution
  mounted: function() { this.fetchBooks(); },

  methods: {

    /**
     * METHOD FETCHBOOKS
     * Used to retrieve all the books from the given URL.
     * Store them in books[] array
     */
    fetchBooks: function() {

      this.$http.get("http://henri-potier.xebia.fr/books")
       .then(function(result){

         var books = [];
         var i=0;
         result.data.forEach(function(elt){
           books.push(
             {
               isbn: elt['isbn'],
               title: elt['title'],
               cover: elt['cover'],
               price: elt['price'],
               quantity: bookList.getQuantityForBook(elt['isbn'])
             }
          );

           i++;

         });

        this.books = books;
        bookList.update();

       });
    },

    /**
     * METHOD FETCHBOOKS
     * Used to retrieve all the reductions from the given URL.
     * Store them in reductions[] array
     * Called each time a book is put in the cart
     * @param: array of books bought
     */
    fetchReductions:function(listOfBooksBought){

      if(listOfBooksBought != ""){
        var request = "";
        listOfBooksBought.forEach(function(elt){
          request += elt['isbn']+",";
        });
        request = request.substring(0, (request.length-1));

        this.$http.get("http://henri-potier.xebia.fr/books/"+request+"/commercialOffers")
         .then(function(result){

           var reductions = [];
           result.body.offers.forEach(function(elt){

             reductions.push(
               {
                 type: elt['type'],
                 sliceValue: elt['sliceValue'],
                 value: elt['value']
               }
            );

          });

          this.reductions = reductions;
          bookList.generateFinalPrice(listOfBooksBought);

        });
      }

    },

    /**
     * METHOD GETIMAGE
     * @param: A book
     * @return: the url of the cover, corresponding to the given book
     */
    getImage: function(book){
      return book['cover'];
    },

    /**
     * METHOD GETQUANTITYFORBOOK
     * @param: isbn of corresponding book
     * @return: number of identical books bought
     */
    getQuantityForBook: function(isbn){
      var quantity = parseInt(getCookie(isbn));
      if(Number.isInteger(quantity)) return quantity;
      else return 0;
    },

    /**
     * METHOD ADDTOCART
     * Add books to cart by updating cookie list.
     * @param: book's index, book object
     */
    addToCart: function(index, book) {

      var d = new Date();
      d.setTime(d.getTime() + (24*60*60*1000));
      var quantity = parseInt(getCookie(book['isbn']));

      if(Number.isInteger(quantity)) bookList.updateQuantity(index, 1);
      else book['quantity'] = 1;

      var cookieString = book['isbn']+"="+book['quantity']+"; expires=" + d.toUTCString();
      document.cookie = cookieString;

      bookList.update();

    },

    /**
     * METHOD DELETEALLCOOKIES
     * Delete all the cookies stored, in order to emptying cart
     */
    deleteAllCookies: function() {

      var cookies = document.cookie.split(";");

      for (var i = 0; i < cookies.length; i++) {
          var cookie = cookies[i];
          var eqPos = cookie.indexOf("=");
          var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
      bookList.update();

    },

    /**
     * METHOD GENERATEFINALPRICE
     * Generate the final price, according to the list of books bought and the possible reductions.
     * @param: list of books bought.
     *
     */
    generateFinalPrice: function(lBooks){

      var normalPrice = 0;
      var reductionList = [];
      var listOfCookies = document.cookie.split('; ');

      lBooks.forEach(function(elt){
        normalPrice += (elt['quantity'] * elt['price']);
      })

      this.reductions.forEach(function(elt){
        reductionList.push(bookList.applyReduction(elt, normalPrice));
      });

      var finalPrice = bookList.comparison(reductionList).toFixed(2);
      document.getElementById('finalPrice').innerHTML = finalPrice;

    },

    /**
     * METHOD APPLYREDUCTION
     * @param: reduction object, total price of all books bought
     * @return: total price with the correct reduction applied
     */
    applyReduction: function(reduction,price){

      switch(reduction['type']){
        case 'percentage':
          return price * (1 - (reduction['value'] * 0.01));
          break;

        case 'minus':
          return price - reduction['value'];
          break;

        case 'slice':
          return price - (Math.floor(price / reduction['sliceValue']) * reduction['value']);
          break;
      };
    },

    /**
     * METHOD COMPARISON
     * Generic method for comparison number
     * @param: array of numbers
     * @return: lowest value from the array
     */
    comparison: function(data){

      var number = data[0];
      data.forEach(function(elt){
        if(elt < number) number = elt;
      });
      return number;

    },

    /**
     * METHOD UPDATEQUANTITY
     * Modify quantity of books bought for a specific one
     * @param: index of the specific book, value to apply. If value = 0, the book is deleted from the cart
     */
    updateQuantity: function(index, value){

      bookList.books[index]['quantity'] += value;

      if(bookList.books[index]['quantity'] < 1 || value == 0) document.cookie = bookList.books[index]['isbn'] + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
      else document.cookie = bookList.books[index]['isbn'] + "=" + bookList.books[index]['quantity'];

      bookList.update();

    },

    /**
     * METHOD UPDATEBOOKINCART
     * Update list of Books in cart.
     */
    updateBookInCart: function(){

      var listOfCookies = document.cookie.split('; ');
      var displayBooks = "";
      var listOfBooksBought = [];

      listOfCookies.forEach(function(elt){

        elt = elt.split('=');

        for(var i=0; i<bookList.books.length; i++){

          if(elt[0] == bookList.books[i]['isbn']){

            displayBooks += '<div class="col-sm-12 smallerText"><span class="col-sm-8 list-group-item"><img class="thumbnail_small" src="'+bookList.books[i]['cover']+'"><h3 class="list-group-item-heading">'+bookList.books[i]['title']+'</h3><h6>'+bookList.books[i]['isbn']+'</h6></span><span class="col-sm-4 list-group-item floatLeft"><h4>'+(bookList.books[i]['price']*bookList.books[i]['quantity'])+'€</h4><h6><p>Quantité : '+bookList.books[i]['quantity']+'</p>';
            displayBooks += '<button onclick="bookList.updateQuantity('+i+',1)"><i class="glyphicon">+</i></button><button onclick="bookList.updateQuantity('+i+',-1)"><i class="glyphicon">-</i></button><button onclick="bookList.updateQuantity('+i+',0)"><i class="glyphicon glyphicon-trash"></i></button></span></div>'
            listOfBooksBought.push(bookList.books[i]);
            break;

          }

        }

      });

      document.getElementById('listOfEltInCart').innerHTML = displayBooks;
      bookList.fetchReductions(listOfBooksBought);

    },

    /**
     * METHOD UPDATE
     * Generic method for updating elements by calling all the necessary methods when needed
     */
    update: function(){
      bookList.updateBookInCart();
      if(document.cookie == '') document.getElementById('finalPrice').innerHTML = 0;
    }
  }
});

/**
 * FUNCTION GETCOOKIE
 * @param: cookie's name to find
 * @return: the decoded cookie if found or an empty string if not.
 */
function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
};
