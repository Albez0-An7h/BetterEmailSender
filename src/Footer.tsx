import { FaLinkedin, FaGithub } from 'react-icons/fa';

const Footer = () => {
    return (
        <footer className="bg-gradient-to-r from-gray-800 to-gray-900 text-white py-6 mt-8 w-full border-t border-gray-700">
            <div className="container mx-auto px-4 flex flex-col md:flex-row justify-center items-center space-y-2 md:space-y-0">
                <div className="flex items-center">
                    <h3 className="text-lg font-medium text-gray-200">
                        Made by Albez0-An7h
                    </h3>
                    <div className="flex ml-4 space-x-3">
                        <a href="https://www.linkedin.com/in/ansh-kumar-723696305/"
                            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-700 hover:bg-blue-600 transition-all duration-300 transform hover:scale-110"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="LinkedIn Profile">
                            <FaLinkedin size={20} />
                        </a>
                        <a href="https://github.com/Albez0-An7h"
                            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 transition-all duration-300 transform hover:scale-110"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="GitHub Profile">
                            <FaGithub size={20} />
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    )
}

export default Footer
