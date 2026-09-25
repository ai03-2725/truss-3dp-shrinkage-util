I would like to update the webapp located in `/truss-webui` with i18n capabilities.  
For now, I would like to start with adding one other language (Japanese).  

As this is a very text-heavy app of which most of the content is manually specified copy, my current hypothesis is that two separate sets of page components would work best for i18n.  
At most the printer edit screen may be shareable with interchangeable copy, but it may end up being more complication to create a behavioral exception for just that page.  

The actual translating of text does not need to occur; I will translate the copy manually once the i18n capabilities and structure are in place.  
As such, my current prediction is that it would be best to duplicate the current pages in English form with identical contents for manual editing afterwards.  

Some other details are as follows:
- The app should store the user's preferred locale in the browser settings, and should show a means of switching language.
  - My recommendation is a icon button with the `globe` icon from the Phosphor iconset matching the already existing icon buttons, which in turn shows a popover for setting the preferred language via a dropdown.  
    This can then be shown beside the X button/home button at the top right in most screens, and along the link icon buttons on the main page for a consistent look.  
- On first load, the browser should check the user's preferred locale and set the app settings accordingly; if the user's locale is not supported by the app, it should fall back to English.
- While for now only English and Japanese will be supported, the app should be structured to allow future additions as necessary.