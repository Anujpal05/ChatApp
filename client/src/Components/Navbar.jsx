import React from 'react'

const Navbar = () => {
  return (
    <>
      <nav className=' bg-gray-800 p-3'>
        <ul className=' hidden lg:flex flex-row  gap-10 justify-center text-xl font-semibold '>
          <li>Home</li>
          <li>About</li>
          <li>Contact</li>
          <li>Setting</li>
          <li>LogIn</li>
        </ul>
        <ul className=' lg:hidden'>
          <li>LogIn</li>
        </ul>
      </nav>
    </>
  )
}

export default Navbar
